import { z } from 'zod';
import { AppError } from '@base/usuarios-acceso';
import { requireEventManager, requireTeamManager } from '../teams/event-access.js';

export const reservedStates = ['PENDING', 'PENDING_REVIEW', 'OBSERVED', 'CONFIRMED', 'COMPLETED'];
export const paymentCodes = { YAPE: 'yape', PLIN: 'plin', BANK_TRANSFER: 'transfer', CASH: 'cash' };
export const participantInput = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  gender: z.enum(['FEMALE', 'MALE']).nullable().default(null),
  phone: z.string().trim().max(40).default(''),
}).strict();
export const enrollmentInput = z.object({ categoryId: z.uuid(), methodId: z.uuid().nullable().default(null),
  participant: participantInput, proofFileId: z.uuid().nullable().default(null) }).strict();
export const correctionInput = z.object({ version: z.number().int().positive(), participant: participantInput,
  proofFileId: z.uuid().nullable().default(null) }).strict();
export const reviewInput = z.object({ version: z.number().int().positive(), decision: z.enum(['CONFIRMED','OBSERVED','REJECTED']),
  note: z.string().trim().max(300).default('') }).strict().refine(v => v.decision === 'CONFIRMED' || !!v.note, 'Indica el motivo de la observación o rechazo');
export const fail = (message, code = 'INVALID_STATE', status = 409) => { throw new AppError(message, status, code); };

export function validateParticipant(category, participant, eventDate) {
  if (category.gender && category.gender !== participant.gender) fail('El género no corresponde a esta categoría', 'CATEGORY_ELIGIBILITY', 400);
  if ((category.minAge !== null || category.maxAge !== null) && !participant.birthDate) fail('Indica la fecha de nacimiento para esta categoría', 'BIRTH_DATE_REQUIRED', 400);
  if (participant.birthDate) {
    const birth = new Date(participant.birthDate + 'T00:00:00Z');
    if (Number.isNaN(birth.getTime()) || birth.toISOString().slice(0,10) !== participant.birthDate || participant.birthDate > new Date().toISOString().slice(0,10)) fail('Fecha de nacimiento inválida', 'INVALID_BIRTH_DATE', 400);
    // eventDate is the calendar date in the event's timezone, frozen when registering.
    const age = Number(eventDate.slice(0,4)) - Number(participant.birthDate.slice(0,4)) - (eventDate.slice(5) < participant.birthDate.slice(5) ? 1 : 0);
    if (age < 0 || age > 120 || (category.minAge !== null && age < category.minAge) || (category.maxAge !== null && age > category.maxAge)) fail('La edad el día del evento no corresponde a la categoría', 'CATEGORY_ELIGIBILITY', 400);
  }
}
export async function audit(tx, registration, actorId, toStatus, note = null) {
  await tx.database.registrationAudit.create({ data: { registrationId: registration.id, actorId,
    fromStatus: registration.status, toStatus, note, participantSnapshot: registration.participantSnapshot } });
}
export async function prepareRegistration(tx, user, eventId, raw) {
  const db = tx.database;
  if (!await db.eventCategory.count({ where: { eventId } })) {
    if (raw && Object.keys(raw).length) fail('Este evento usa inscripción general', 'INVALID_INPUT', 400);
    return;
  }
  const input = enrollmentInput.parse(raw);
  const event = await db.event.findUnique({ where: { id: eventId }, include: { team: true } });
  if (!event?.team?.active || event.status !== 'PUBLISHED' || event.startsAt <= new Date()) fail('El evento no acepta inscripciones', 'EVENT_NOT_OPEN');
  const category = await db.eventCategory.findFirst({ where: { id: input.categoryId, eventId, active: true } });
  if (!category) fail('Categoría no disponible', 'CATEGORY_NOT_FOUND', 400);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: event.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(event.startsAt);
  const part = type => parts.find(p => p.type === type).value;
  const eventDate = `${part('year')}-${part('month')}-${part('day')}`;
  validateParticipant(category, input.participant, eventDate);
  if (category.capacity !== null && await db.eventRegistration.count({ where: { categoryId: category.id, status: { in: reservedStates } } }) >= category.capacity) fail('Cupo de categoría agotado', 'CATEGORY_CAPACITY_REACHED');
  let method = null;
  if (category.priceCents) {
    const selected = input.methodId && await db.eventPaymentMethod.findUnique({ where: { eventId_methodId: { eventId, methodId: input.methodId } }, include: { method: true } });
    method = selected?.method;
    if (!method?.active || method.teamId !== event.teamId || method.currency !== category.currency) fail('Selecciona un método activo del evento y de la misma moneda', 'INVALID_PAYMENT_METHOD', 400);
    if (!event.team.paymentRecipientId) fail('Team sin destinatario de pagos', 'NOT_CONFIGURED');
  } else if (input.methodId || input.proofFileId) fail('La categoría gratuita no requiere pago ni comprobante', 'INVALID_INPUT', 400);
  const categorySnapshot = { name: category.name, description: category.description, gender: category.gender, minAge: category.minAge, maxAge: category.maxAge,
    modality: category.modality, eventDate, ageReference: 'EVENT_DATE' };
  const instructions = method ? { recipientName: event.team.name, methodId: method.id, type: method.type, label: method.label, phone: method.phone,
    holder: method.holderName, bank: method.bank, accountNumber: method.accountNumber, cci: method.cci, currency: method.currency, instructions: method.instructions, qrFileId: method.qrFileId } : undefined;
  return { manualReview: true, event: { amountCents: category.priceCents, currency: category.currency, paymentRecipientId: method ? event.team.paymentRecipientId : null },
    payment: method ? { instructions, qrFileId: method.qrFileId } : undefined,
    data: { categoryId: category.id, methodId: method?.id || null, amountCents: category.priceCents, currency: category.currency, categorySnapshot,
      participantSnapshot: { username: user.username, name: user.name, lastName: user.lastName, email: user.email, ...input.participant } } };
}

async function categoryRegistration(tx, operation) {
  if (operation.sourceType !== 'registration') return null;
  const r = await tx.database.eventRegistration.findUnique({ where: { id: operation.sourceId }, include: { event: true } });
  return r?.categoryId ? r : null;
}
export const categoryPaymentPolicy = {
  async authorize(tx, user, operation, admin) {
    const r = await categoryRegistration(tx, operation);
    if (!r) return false;
    if (admin) await requireEventManager(tx.database, user, r.event);
    else if (r.userId !== user?.id) fail('Inscripción no disponible', 'NOT_FOUND', 404);
    return true;
  },
  async validateRegister(tx, user, operation, input) {
    const r = await categoryRegistration(tx, operation);
    if (!r) return false;
    if (!['PENDING','OBSERVED'].includes(r.status)) fail('La inscripción no admite otro comprobante');
    if (input.method !== paymentCodes[operation.instructions.type] || (input.method !== 'cash' && !input.proofFileId)) fail('El método o comprobante no corresponde a la inscripción', 'INVALID_PAYMENT', 400);
    return true;
  },
  async registered(tx, user, operation, payment) {
    const r = await categoryRegistration(tx, operation);
    await audit(tx, r, user.id, 'PENDING_REVIEW');
    await tx.database.eventRegistration.update({ where: { id: r.id }, data: { status: 'PENDING_REVIEW', proofFileId: payment.proofFileId, reviewNote: null, version: { increment: 1 } } });
  },
  async validateReview(tx, user, operation) {
    const r = await categoryRegistration(tx, operation);
    return !!r;
  },
};
export async function onRegistrationResult(tx, result, registration, confirm) {
  if (!registration.categoryId) return false;
  if (registration.status !== 'PENDING_REVIEW') fail('La inscripción ya no está pendiente de revisión');
  const status = { verified: 'CONFIRMED', observed: 'OBSERVED', rejected: 'REJECTED' }[result.status];
  if (!status) fail('Resultado de pago inválido');
  if (status === 'CONFIRMED') await confirm();
  await audit(tx, registration, result.reviewedBy, status, result.rejectionReason);
  await tx.database.eventRegistration.update({ where: { id: registration.id }, data: { status, reviewNote: result.rejectionReason, version: { increment: 1 } } });
  await tx.operations.update(result.operationId, { acceptingPayments: status === 'OBSERVED', acceptingReviews: status === 'OBSERVED' });
  return true;
}
