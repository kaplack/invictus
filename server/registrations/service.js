import { z } from 'zod';
import { requireEventManager, lockManagedEvent, teamSummary } from '../teams/event-access.js';
import { enrollmentInput, correctionInput, reviewInput, validateParticipant, audit, fail, paymentCodes, reservedStates } from './policy.js';

const uuid = z.uuid();
const person = { id: true, name: true, lastName: true, email: true };
export function createCategoryRegistrations({ database: db, commerce, registrationsFor, paymentsFor, files }) {
  async function accessible(database, user, id, manager = false) {
    uuid.parse(id);
    const r = await database.eventRegistration.findUnique({ where: { id }, include: { event: { include: { team: { select: teamSummary } } }, user: { select: person } } });
    if (!r?.categoryId) fail('Inscripción no disponible', 'NOT_FOUND', 404);
    if (manager || r.userId !== user.id) await requireEventManager(database, user, r.event);
    return r;
  }
  async function openEvent(id) {
    uuid.parse(id);
    const e = await db.event.findUnique({ where: { id }, include: { team: true } });
    if (!e?.team?.active || e.status !== 'PUBLISHED' || e.startsAt <= new Date()) fail('El evento no acepta inscripciones', 'EVENT_NOT_OPEN');
    return e;
  }
  async function content(fileId) {
    const file = await db.storedFile.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) fail('Archivo no disponible', 'NOT_FOUND', 404);
    const owner = { id: file.ownerId }, access = await files.access(file.id, owner);
    return files.content(file.id, owner, Object.fromEntries(new URLSearchParams(access.path.split('?')[1])));
  }
  async function pending(tx, r, actorId) {
    await audit(tx, r, actorId, 'PENDING_REVIEW');
    return tx.database.eventRegistration.update({ where: { id: r.id }, data: { status: 'PENDING_REVIEW', reviewNote: null, version: { increment: 1 } } });
  }
  return {
    async options(user, eventId) {
      await openEvent(eventId);
      const [categories, selected, registration] = await Promise.all([
        db.eventCategory.findMany({ where: { eventId, active: true }, orderBy: { createdAt: 'asc' } }),
        db.eventPaymentMethod.findMany({ where: { eventId, method: { active: true } }, include: { method: true } }),
        db.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId: user.id } }, select: { id: true, categoryId: true, status: true } }),
      ]);
      return { categories, methods: selected.map(({ method: m }) => ({ id: m.id, type: m.type, label: m.label, currency: m.currency,
        holder: m.holderName, phone: m.phone, bank: m.bank, accountNumber: m.accountNumber, cci: m.cci, instructions: m.instructions, hasQr: !!m.qrFileId })), registration };
    },
    async optionQr(user, eventId, methodId) {
      await openEvent(eventId); uuid.parse(methodId);
      const selected = await db.eventPaymentMethod.findUnique({ where: { eventId_methodId: { eventId, methodId } }, include: { method: true } });
      if (!selected?.method.active || !selected.method.qrFileId) fail('QR no disponible', 'NOT_FOUND', 404);
      return content(selected.method.qrFileId);
    },
    async enroll(user, eventId, raw) {
      uuid.parse(eventId); const input = enrollmentInput.parse(raw);
      return commerce.run(null, async tx => {
        const previous = await tx.database.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
        if (previous) {
          if (previous.categoryId !== input.categoryId || previous.methodId !== input.methodId) fail('Ya tienes una inscripción para este evento', 'DUPLICATE_REGISTRATION');
          return previous;
        }
        const r = await registrationsFor(tx.database).service.create(user, eventId, input);
        if (!r.categoryId) fail('Este evento usa inscripción general', 'INVALID_INPUT', 400);
        if (r.amountCents > 0) await paymentsFor(tx.database).register(user, r.id, { method: paymentCodes[r.paymentInstructionsSnapshot.type], proofFileId: input.proofFileId });
        else await pending(tx, r, user.id);
        return tx.database.eventRegistration.findUnique({ where: { id: r.id } });
      });
    },
    async get(user, id) {
      const r = await accessible(db, user, id);
      const [payments, audits] = await Promise.all([
        db.manualPayment.findMany({ where: { operationId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
        db.registrationAudit.findMany({ where: { registrationId: id }, include: { actor: { select: { name: true, lastName: true } } }, orderBy: { createdAt: 'asc' } }),
      ]);
      return { ...r, payments, audits };
    },
    async resubmit(user, id, raw) {
      uuid.parse(id); const input = correctionInput.parse(raw);
      return commerce.run(id, async tx => {
        const r = await accessible(tx.database, user, id);
        if (r.userId !== user.id) fail('Solo el participante puede corregir la inscripción', 'FORBIDDEN', 403);
        if (r.status !== 'OBSERVED' || r.version !== input.version) fail('La inscripción cambió; vuelve a cargarla', 'STALE_REGISTRATION');
        if (['CANCELLED','FINISHED','CLOSED'].includes(r.event.status)) fail('El evento está cerrado');
        validateParticipant(r.categorySnapshot, input.participant, r.categorySnapshot.eventDate);
        const corrected = await tx.database.eventRegistration.update({ where: { id }, data: { participantSnapshot: { ...r.participantSnapshot, ...input.participant } } });
        if (r.amountCents > 0) await paymentsFor(tx.database).register(user, id, { method: paymentCodes[r.paymentInstructionsSnapshot.type], proofFileId: input.proofFileId });
        else {
          if (input.proofFileId) fail('Una inscripción gratuita no requiere comprobante', 'INVALID_INPUT', 400);
          await pending(tx, corrected, user.id);
        }
        return tx.database.eventRegistration.findUnique({ where: { id } });
      });
    },
    async review(user, id, raw) {
      uuid.parse(id); const input = reviewInput.parse(raw);
      return commerce.run(null, async tx => {
        const r = await accessible(tx.database, user, id, true);
        await lockManagedEvent(tx.database, user, r.eventId);
        if (r.version !== input.version || r.status !== 'PENDING_REVIEW') fail('La inscripción cambió; vuelve a cargarla antes de revisar', 'STALE_REGISTRATION');
        if (r.amountCents > 0) {
          const payment = await tx.database.manualPayment.findFirst({ where: { operationId: id, status: { in: ['pending','pending_review'] } } });
          if (!payment) fail('No hay pago pendiente');
          await paymentsFor(tx.database).review(user, id, payment.id, { status: { CONFIRMED: 'verified', OBSERVED: 'observed', REJECTED: 'rejected' }[input.decision], reason: input.note });
        } else {
          if (input.decision !== 'OBSERVED') await registrationsFor(tx.database).service.review(user, id, input.decision);
          await audit(tx, r, user.id, input.decision, input.note || null);
          await tx.database.eventRegistration.update({ where: { id }, data: { status: input.decision, reviewNote: input.note || null, version: { increment: 1 } } });
        }
        return tx.database.eventRegistration.findUnique({ where: { id } });
      });
    },
    async list(user, eventId, query) {
      uuid.parse(eventId);
      const input = z.object({ q: z.string().trim().max(120).default(''), categoryId: z.uuid().optional(),
        status: z.enum(['PENDING_REVIEW','OBSERVED','CONFIRMED','REJECTED','PENDING','CANCELLED','COMPLETED']).optional(), offset: z.coerce.number().int().min(0).max(1000000).default(0) }).strict().parse(query);
      const event = await db.event.findUnique({ where: { id: eventId } });
      if (!event) fail('Evento no disponible', 'NOT_FOUND', 404);
      await requireEventManager(db, user, event);
      const where = { eventId, ...(input.status ? { status: input.status } : {}), ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.q ? { user: { OR: ['name','lastName','email'].map(key => ({ [key]: { contains: input.q, mode: 'insensitive' } })) } } : {}) };
      const [items, total, groups, categories, categoryCounts, configuration] = await Promise.all([
        db.eventRegistration.findMany({ where, include: { user: { select: person } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 20, skip: input.offset }),
        db.eventRegistration.count({ where }), db.eventRegistration.groupBy({ by: ['status'], where: { eventId }, _count: true }),
        db.eventCategory.findMany({ where: { eventId }, select: { id: true, name: true, capacity: true } }),
        db.eventRegistration.groupBy({ by: ['categoryId'], where: { eventId, status: { in: reservedStates } }, _count: true }),
        db.eventRegistrationConfig.findUnique({ where: { eventId } }),
      ]);
      const occupied = groups.filter(g => reservedStates.includes(g.status)).reduce((sum,g) => sum + g._count, 0);
      return { items, total, nextOffset: input.offset + items.length < total ? input.offset + 20 : null,
        summary: { statuses: Object.fromEntries(groups.map(g => [g.status,g._count])), occupied, capacity: configuration?.maxCapacity ?? null },
        categories: categories.map(c => ({ ...c, occupied: categoryCounts.find(g => g.categoryId === c.id)?._count || 0 })) };
    },
    async proof(user, id, paymentId) {
      const r = await accessible(db, user, id); uuid.parse(paymentId);
      return paymentsFor(db).proof(user, id, paymentId, r.userId !== user.id);
    },
    async qr(user, id) {
      const r = await accessible(db, user, id);
      return paymentsFor(db).qr(user, id, r.userId !== user.id);
    },
  };
}
