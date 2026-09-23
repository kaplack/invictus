import { AppError } from '@base/usuarios-acceso';
import { recipientAccess, strictInput } from './policy.js';
export function createRecipientService({ store, resolvePermissions }) {
  return {
    async list(user) {
      return store.run(null, async tx => {
        const grants = await resolvePermissions(user);
        if (!grants.includes('panel:access')) throw new AppError('Acceso denegado', 403, 'FORBIDDEN');
        return tx.recipients.list(user.id, { manage: grants.includes('recipients:manage'), review: grants.includes('payments:review') });
      });
    },
    async update(user, id, input) {
      strictInput(input, ['phone', 'holder', 'qrFileId']);
      if (!/^9\d{8}$/.test(input.phone) || typeof input.holder !== 'string' || !input.holder.trim() || input.holder.trim().length > 120
        || (input.qrFileId !== null && typeof input.qrFileId !== 'string')) throw new AppError('Indica número Yape de 9 dígitos, titular y QR (o null)', 400, 'INVALID_RECIPIENT');
      return store.run(null, async tx => {
        await recipientAccess(tx, user, id, 'manage', resolvePermissions);
        const recipient = await tx.recipients.lock(id);
        if (!recipient) throw new AppError('Destinatario no disponible', 404, 'RECIPIENT_NOT_FOUND');
        if (input.qrFileId) {
          const file = await tx.files.lock(input.qrFileId);
          if (!file || file.deletedAt || file.visibility !== 'private' || !['image/png', 'image/jpeg', 'image/webp'].includes(file.contentType)
            || (file.ownerId !== user.id && input.qrFileId !== recipient.qrFileId)) throw new AppError('Usa una imagen QR privada propia', 400, 'INVALID_QR');
        }
        return tx.recipients.update(id, { phone: input.phone, holder: input.holder.trim(), qrFileId: input.qrFileId });
      });
    }
  };
}
