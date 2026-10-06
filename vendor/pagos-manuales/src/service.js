import { randomUUID } from 'node:crypto';
import { AppError } from '@base/usuarios-acceso';
import { strictInput, recipientAccess, unavailable } from './policy.js';

// No conoce pedidos. El adaptador de origen conserva sus reglas de negocio.
export function createPaymentService({ store, fileService, resolvePermissions, methods = ['cash', 'yape', 'plin'], onResult = async () => {}, operationPolicy }) {
  if (!methods.length || methods.some(m => !['cash', 'yape', 'plin'].includes(m))) throw new Error('Métodos inválidos');
  async function authorize(tx, user, id, admin) {
    const operation = await tx.operations.find(id);
    if (!operation) throw unavailable();
    if (operationPolicy && await operationPolicy.authorize(tx, user, operation, admin)) return operation;
    if (admin) await recipientAccess(tx, user, operation.recipientId, 'review', resolvePermissions);
    else if (operation.payerId !== user?.id) throw unavailable();
    return operation;
  }
  async function content(fileId, ownerId, guestAccessHash) {
    const owner = { id: ownerId, guestAccessHash };
    const access = await fileService.access(fileId, owner);
    return fileService.content(fileId, owner, Object.fromEntries(new URLSearchParams(access.path.split('?')[1])));
  }
  return {
    methods,
    async operations(user, admin = false, offset = 0) {
      if (!Number.isSafeInteger(offset) || offset < 0) throw new AppError('Paginación inválida', 400, 'INVALID_OFFSET');
      return store.run(null, async tx => {
        if (!admin) return tx.operations.list({ payerId: user.id }, offset);
        const grants = await resolvePermissions(user);
        if (!grants.includes('panel:access') || !grants.includes('payments:review')) throw new AppError('Acceso denegado', 403, 'FORBIDDEN');
        const recipients = await tx.recipients.list(user.id, { review: true });
        return tx.operations.list({ recipientIds: recipients.map(r => r.id) }, offset);
      });
    },
    async operation(user, id, admin = false) {
      return store.run(id, async tx => ({ operation: await authorize(tx, user, id, admin), results: await tx.results.list(id) }));
    },
    async list(user, id, admin = false) {
      return store.run(id, async tx => { await authorize(tx, user, id, admin); return tx.payments.list(id); });
    },
    async register(user, id, input) {
      strictInput(input, ['method', 'proofFileId']);
      return store.run(id, async tx => {
        const operation = await authorize(tx, user, id, false);
        const custom = operationPolicy && await operationPolicy.validateRegister(tx, user, operation, input);
        if (!custom && (!methods.includes(input.method) || (input.method === 'cash' ? input.proofFileId != null : typeof input.proofFileId !== 'string'))) throw new AppError('Método o comprobante inválido', 400, 'INVALID_PAYMENT');
        if (!operation.acceptingPayments) throw new AppError('La operación está cerrada', 409, 'OPERATION_CLOSED');
        if ((await tx.payments.list(id)).some(p => !['rejected','observed'].includes(p.status))) throw new AppError('Ya existe un pago pendiente o verificado', 409, 'PAYMENT_EXISTS');
        if (input.proofFileId) {
          const file = await tx.files.lock(input.proofFileId);
          if (!file || file.deletedAt || (file.ownerId ? file.ownerId !== user.id : !user.guestAccessHash || file.guestAccessHash !== user.guestAccessHash) || file.visibility !== 'private') throw new AppError('Selecciona un comprobante privado propio', 400, 'INVALID_PROOF');
          if (await tx.payments.usesFile(file.id)) throw new AppError('El comprobante ya está asociado a un pago', 409, 'PROOF_ALREADY_USED');
        }
        const payment = await tx.payments.create({ id: randomUUID(), operationId: id, method: input.method, status: input.method === 'cash' ? 'pending' : 'pending_review',
          amountCents: operation.amountCents, currency: operation.currency, proofFileId: input.proofFileId || null, createdAt: new Date(), reviewedAt: null, reviewedBy: null, rejectionReason: null });
        if (custom) await operationPolicy.registered(tx, user, operation, payment);
        return payment;
      });
    },
    async review(user, id, paymentId, input) {
      strictInput(input, ['status', 'reason']);
      if (!['verified', 'rejected', 'observed'].includes(input.status) || (input.status !== 'verified' && (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 300))) throw new AppError('Indica una decisión y un motivo de hasta 300 caracteres', 400, 'INVALID_REVIEW');
      return store.run(id, async tx => {
        const operation = await authorize(tx, user, id, true);
        const custom = operationPolicy && await operationPolicy.validateReview(tx, user, operation, input);
        if (!custom && input.status === 'observed') throw new AppError('Este pago no admite observaciones', 400, 'INVALID_REVIEW');
        const payment = (await tx.payments.list(id)).find(p => p.id === paymentId);
        if (!payment) throw new AppError('Pago no disponible', 404, 'PAYMENT_NOT_FOUND');
        if (payment.status === input.status && (input.status === 'verified' || payment.rejectionReason === input.reason.trim())) return payment;
        if (!operation.acceptingReviews) throw new AppError('La operación está cerrada', 409, 'OPERATION_CLOSED');
        if (!['pending', 'pending_review'].includes(payment.status)) throw new AppError('Transición de pago no permitida', 409, 'INVALID_PAYMENT_TRANSITION');
        if (payment.proofFileId) {
          const file = await tx.files.lock(payment.proofFileId);
          if (!file || file.deletedAt) throw new AppError('Comprobante no disponible', 409, 'PROOF_UNAVAILABLE');
        }
        const reviewed = await tx.payments.update(paymentId, { status: input.status, reviewedBy: user.id, reviewedAt: new Date(), rejectionReason: input.status !== 'verified' ? input.reason.trim() : null });
        const result = await tx.results.create({ paymentId, operationId: id, sourceType: operation.sourceType, sourceId: operation.sourceId,
          status: reviewed.status, reviewedAt: reviewed.reviewedAt, reviewedBy: user.id, rejectionReason: reviewed.rejectionReason });
        // Solo efectos en la MISMA transacción. Nunca APIs, correos o efectos externos.
        const handled = await onResult(tx, result);
        if (result.sourceType === 'registration' && handled !== true)
          throw new AppError('Configura el coordinador de inscripciones para revisar este pago', 409, 'COORDINATOR_REQUIRED');
        return reviewed;
      });
    },
    async proof(user, id, paymentId, admin = false) {
      const { ownerId, fileId, guestAccessHash } = await store.run(id, async tx => {
        const operation = await authorize(tx, user, id, admin);
        const payment = (await tx.payments.list(id)).find(p => p.id === paymentId);
        if (!payment?.proofFileId) throw new AppError('Comprobante no disponible', 404, 'PROOF_NOT_FOUND');
        const receipt = await tx.files.lock(payment.proofFileId);
        if (!receipt || receipt.deletedAt) throw unavailable();
        return { ownerId: receipt.ownerId, guestAccessHash: receipt.guestAccessHash, fileId: receipt.id };
      });
      return content(fileId, ownerId, guestAccessHash);
    },
    async qr(user, id, admin = false) {
      const file = await store.run(id, async tx => {
        const operation = await authorize(tx, user, id, admin);
        const qr = operation.qrFileId && await tx.files.lock(operation.qrFileId);
        if (!qr || qr.deletedAt) throw new AppError('QR no disponible', 404, 'QR_NOT_FOUND');
        return qr;
      });
      return content(file.id, file.ownerId);
    }
  };
}
