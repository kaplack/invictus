import QRCode from 'qrcode';
import { requirePort, normalizePublicBaseUrl } from '@base/usuarios-acceso/contracts';
import { createRegistrationService } from './service.js';
import { RegistrationError } from './errors.js';

// El host aporta openPaymentOperation de @base/pagos-manuales y stores ligados
// a tx.database. No se abre otra transacción desde los callbacks de pagos.
export function createRegistrationPaymentAdapter({ commerceStore, readStore, storeForTransaction,
  openPaymentOperation, profileReader, publicBaseUrl, experimental = false }) {
  requirePort(commerceStore, ['run'], 'commerceStore');
  if (typeof storeForTransaction !== 'function' || typeof openPaymentOperation !== 'function')
    throw new TypeError('Configura storeForTransaction y openPaymentOperation');
  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const reads = createRegistrationService({ store: readStore, profileReader, publicBaseUrl: baseUrl });
  const disabled = () => { throw new RegistrationError('Flujo pendiente de reservas y cancelación; solo pruebas locales explícitas', 409, 'INTEGRATION_NOT_READY'); };
  const paymentOnly = () => { throw new RegistrationError('Usa la API de pagos con el ID de inscripción como operación', 409, 'USE_PAYMENT_API'); };
  const service = {
    getOwn: reads.getOwn.bind(reads), listManaged: reads.listManaged.bind(reads),
    publicValidate: reads.publicValidate.bind(reads), listForProfile: reads.listForProfile.bind(reads),
    attachProfile: reads.attachProfile.bind(reads),
    submitProof: paymentOnly, review: paymentOnly, cancel: disabled,
    async create(user, eventId) {
      if (!experimental) disabled();
      return commerceStore.run(null, async tx => {
        const store = storeForTransaction(tx);
        const event = await store.events.get(eventId);
        if (!event || !Number.isSafeInteger(event.amountCents) || event.amountCents <= 0)
          throw new RegistrationError('Este adaptador requiere un evento con tarifa', 409, 'PAID_EVENT_REQUIRED');
        const service = createRegistrationService({ store, publicBaseUrl: baseUrl,
          async onCreated(registration, currentEvent) {
            const operation = await openPaymentOperation(tx, { id: registration.id, sourceType: 'registration',
              sourceId: registration.id, payerId: registration.userId, recipientId: currentEvent.paymentRecipientId,
              amountCents: currentEvent.amountCents, currency: currentEvent.currency });
            return store.registrations.update(registration.id, { ...registration, paymentInstructionsSnapshot: operation.instructions });
          }
        });
        return service.create(user, eventId);
      });
    }
  };
  return {
    service,
    async onResult(tx, result) {
      if (result.sourceType !== 'registration') return false;
      if (!experimental) disabled();
      const store = storeForTransaction(tx);
      const registration = await store.registrations.get(result.sourceId);
      const operation = await tx.operations.find(result.operationId);
      if (!registration || !operation || operation.sourceType !== 'registration' || operation.sourceId !== registration.id
        || operation.payerId !== registration.userId || operation.id !== registration.id)
        throw new RegistrationError('Origen de pago incompatible', 409, 'PAYMENT_SOURCE_CONFLICT');
      if (registration.status !== 'PENDING') throw new RegistrationError('Inscripción no disponible para confirmar', 409, 'INVALID_STATE');
      // Un rechazo monetario no libera cupo ni declara rechazo de participación.
      if (result.status === 'rejected') return true;
      if (result.status !== 'verified') throw new RegistrationError('Resultado desconocido', 400, 'INVALID_INPUT');
      const code = `EV-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      await store.registrations.update(registration.id, { ...registration, status: 'CONFIRMED', participationCode: code,
        participationQrDataUrl: await QRCode.toDataURL(`${baseUrl}/participacion/${code}`), updatedAt: new Date().toISOString() });
      await tx.operations.update(operation.id, { acceptingPayments: false, acceptingReviews: false });
      return true;
    }
  };
}
