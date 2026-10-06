import { randomUUID } from 'node:crypto';
import { AppError } from '@base/usuarios-acceso';
// Puerto interno: el módulo de origen valida identidad, importe y destinatario. No exponer como POST público.
export async function openPaymentOperation(tx, { id = randomUUID(), sourceType, sourceId, payerId, recipientId, amountCents, currency, instructions, qrFileId }) {
  if (!/^[a-z][a-z0-9_-]{0,39}$/.test(sourceType) || typeof sourceId !== 'string' || !sourceId || sourceId.length > 100 || (!payerId && !(sourceType === 'registration' && payerId === null))
    || !Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 2000000000 || !/^[A-Z]{3}$/.test(currency)) throw new Error('Operación de origen inválida');
  const recipient = await tx.recipients.lock(recipientId);
  if (!recipient) throw new AppError('Destinatario no configurado', 409, 'RECIPIENT_NOT_CONFIGURED');
  const previous = await tx.operations.findSource(sourceType, sourceId);
  if (previous) {
    if (previous.payerId !== payerId || previous.recipientId !== recipientId || previous.amountCents !== amountCents || previous.currency !== currency)
      throw new AppError('La operación ya existe con otros datos', 409, 'OPERATION_CONFLICT');
    return previous;
  }
  const selectedQr = qrFileId === undefined ? recipient.qrFileId : qrFileId;
  if (selectedQr) {
    const file = await tx.files.lock(selectedQr);
    if (!file || file.deletedAt) throw new AppError('QR no disponible', 409, 'QR_UNAVAILABLE');
  }
  return tx.operations.create({ id, sourceType, sourceId, payerId, recipientId, amountCents, currency,
    instructions: instructions ?? { recipientName: recipient.name, phone: recipient.phone, holder: recipient.holder, qrFileId: recipient.qrFileId, legacy: !recipient.phone },
    qrFileId: selectedQr, acceptingPayments: true, acceptingReviews: true, createdAt: new Date() });
}
