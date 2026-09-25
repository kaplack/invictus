import { normalizePublicBaseUrl, requirePort } from '@base/usuarios-acceso/contracts';
import { createPrismaRegistrationStore } from './prisma-store.js';
import { createRegistrationService } from './service.js';
import { createRegistrationPaymentAdapter } from './payment-adapter.js';
import { RegistrationError } from './errors.js';
import QRCode from 'qrcode';

export function createPrismaRegistrationCoordinator({ database, Prisma, commerceStore, openPaymentOperation,
  publicBaseUrl, resolvePermissions, policy, authorizeManage, autoConfirmFree = false }) {
  if (policy !== 'reserve-until-terminal') throw new TypeError('Selecciona policy: reserve-until-terminal');
  requirePort(commerceStore, ['run'], 'commerceStore');
  if (!database.eventRegistrationConfig || !Prisma?.DbNull || typeof openPaymentOperation !== 'function' || typeof resolvePermissions !== 'function')
    throw new TypeError('Configuración de inscripciones incompleta');
  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const auth = user => { if (!user?.id) throw new RegistrationError('Autenticación requerida', 401, 'UNAUTHENTICATED'); };
  const storeFor = db => createPrismaRegistrationStore(db, { Prisma, coordinated: true, eventReader: {
    async get(id) {
      const event = await db.event.findUnique({ where: { id } });
      if (!event) return null;
      const config = await db.eventRegistrationConfig.findUnique({ where: { eventId: id } });
      if (!config) throw new RegistrationError('Configura las inscripciones del evento', 409, 'REGISTRATION_NOT_CONFIGURED');
      return { ...event, ...config, id: event.id };
    }
  } });
  const profilesFor = db => db.participantProfile ? { get: id => db.participantProfile.findUnique({ where: { id } }) } : undefined;
  const serviceFor = tx => createRegistrationService({ store: storeFor(tx.database), profileReader: profilesFor(tx.database), publicBaseUrl: baseUrl,
    authorizeManage: authorizeManage ? (user, event) => authorizeManage(tx.database, user, event) : undefined,
    async onCreated(registration, event) {
      if (event.amountCents === 0) {
        if (!autoConfirmFree) return registration;
        // Explicit host policy, executed only after a valid free enrollment; no impersonated organizer.
        const participationCode = `EV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
        return storeFor(tx.database).registrations.update(registration.id, { ...registration, status: 'CONFIRMED', participationCode,
          participationQrDataUrl: await QRCode.toDataURL(`${baseUrl}/participacion/${participationCode}`) });
      }
      const operation = await openPaymentOperation(tx, { id: registration.id, sourceType: 'registration', sourceId: registration.id,
        payerId: registration.userId, recipientId: event.paymentRecipientId, amountCents: event.amountCents, currency: event.currency });
      return storeFor(tx.database).registrations.update(registration.id, { ...registration, paymentInstructionsSnapshot: operation.instructions });
    }
  });
  const paymentAdapter = createRegistrationPaymentAdapter({ commerceStore, readStore: storeFor(database),
    storeForTransaction: tx => storeFor(tx.database), openPaymentOperation, publicBaseUrl: baseUrl, experimental: true });
  const service = {
    async configure(user, eventId, input) {
      auth(user);
      if (!input || Object.keys(input).some(k => !['amountCents','currency','maxCapacity','paymentRecipientId'].includes(k))
        || !Number.isSafeInteger(input.amountCents) || input.amountCents < 0 || input.amountCents > 2000000000 || !/^[A-Z]{3}$/.test(input.currency)
        || !(input.maxCapacity === null || Number.isSafeInteger(input.maxCapacity) && input.maxCapacity > 0 && input.maxCapacity <= 2147483647)
        || (input.amountCents > 0 ? typeof input.paymentRecipientId !== 'string' : input.paymentRecipientId != null))
        throw new RegistrationError('Configuración inválida', 400, 'INVALID_INPUT');
      return commerceStore.run(null, async tx => {
        const event = await tx.database.event.findUnique({ where: { id: eventId } });
        if (!event) throw new RegistrationError('Evento no disponible', 403, 'FORBIDDEN');
        if (authorizeManage) await authorizeManage(tx.database, user, event);
        else if (event.organizerId !== user.id && user.role !== 'SUPERADMIN') throw new RegistrationError('Evento no disponible', 403, 'FORBIDDEN');
        if (input.amountCents > 0) {
          const grants = await resolvePermissions(user);
          const member = await tx.recipients.access(input.paymentRecipientId, user.id);
          if (!grants.includes('panel:access') || !grants.includes('recipients:manage') || !member?.manage)
            throw new RegistrationError('Sin permiso para asignar este destinatario', 403, 'FORBIDDEN');
        }
        const data = { amountCents: input.amountCents, currency: input.currency, maxCapacity: input.maxCapacity, paymentRecipientId: input.paymentRecipientId ?? null };
        const current = await tx.database.eventRegistrationConfig.findUnique({ where: { eventId } });
        if (current && Object.entries(data).every(([key,value]) => current[key] === value)) return current;
        if (await tx.database.eventRegistration.count({ where: { eventId } })) throw new RegistrationError('La configuración queda fija al recibir inscripciones', 409, 'CONFIG_IN_USE');
        return tx.database.eventRegistrationConfig.upsert({ where: { eventId }, create: { eventId, ...data }, update: data });
      });
    },
    async create(user, eventId) {
      auth(user);
      return commerceStore.run(null, async tx => {
        const store = storeFor(tx.database);
        const previous = await store.registrations.findByEventUser(eventId, user.id);
        // Identidad natural: un usuario/evento. No reactiva estados terminales.
        if (previous) return previous;
        const event = await store.events.get(eventId);
        if (event?.maxCapacity !== null && event?.maxCapacity !== undefined) {
          const count = await tx.database.eventRegistration.count({ where: { eventId, status: { in: ['PENDING','PENDING_REVIEW','CONFIRMED','COMPLETED'] } } });
          if (count >= event.maxCapacity) throw new RegistrationError('Cupo agotado', 409, 'CAPACITY_REACHED');
        }
        return serviceFor(tx).create(user, eventId);
      });
    },
    async cancel(user, id) {
      auth(user);
      return commerceStore.run(id, async tx => {
        const registration = await serviceFor(tx).getOwn(user, id);
        if (registration.status === 'CANCELLED') return registration;
        if (registration.status === 'COMPLETED') throw new RegistrationError('Inscripción finalizada', 409, 'INVALID_STATE');
        const operation = await tx.operations.findSource('registration', id);
        if (operation) {
          if ((await tx.payments.list(operation.id)).some(p => p.status === 'verified')) throw new RegistrationError('El pago verificado requiere devolución antes de cancelar', 409, 'REFUND_REQUIRED');
          await tx.operations.update(operation.id, { acceptingPayments: false, acceptingReviews: false });
        }
        return storeFor(tx.database).registrations.update(id, { ...registration, status: 'CANCELLED' });
      });
    },
    async review(user, id, decision) {
      return commerceStore.run(id, async tx => {
        if (await tx.operations.findSource('registration', id)) throw new RegistrationError('Revisa el pago mediante la API de pagos', 409, 'USE_PAYMENT_API');
        const current = await tx.database.eventRegistration.findUnique({ where: { id } });
        if (current) {
          await serviceFor(tx).listManaged(user, current.eventId);
          if (current.status === decision && ['CONFIRMED','REJECTED'].includes(decision)) return storeFor(tx.database).registrations.get(id);
        }
        return serviceFor(tx).review(user, id, decision);
      });
    },
    submitProof() { throw new RegistrationError('Usa la API de pagos', 409, 'USE_PAYMENT_API'); },
    attachProfile: (user,id,profileId) => commerceStore.run(id, tx => serviceFor(tx).attachProfile(user,id,profileId)),
    getOwn: (user,id) => commerceStore.run(id, tx => serviceFor(tx).getOwn(user,id)),
    listManaged: (user,eventId) => commerceStore.run(null, tx => serviceFor(tx).listManaged(user,eventId)),
    publicValidate: code => commerceStore.run(null, tx => serviceFor(tx).publicValidate(code)),
    listForProfile: (user,id) => commerceStore.run(null, tx => serviceFor(tx).listForProfile(user,id))
  };
  return { service, onResult: paymentAdapter.onResult };
}
