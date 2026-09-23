import { AppError } from '@base/usuarios-acceso';
export const unavailable = () => new AppError('Operación no disponible', 404, 'OPERATION_NOT_FOUND');
export function strictInput(input, keys) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k)))
    throw new AppError('Datos no válidos. El destinatario lo determina el servidor.', 400, 'INVALID_INPUT');
}
export async function recipientAccess(tx, user, recipientId, capability, resolvePermissions) {
  const permission = capability === 'manage' ? 'recipients:manage' : 'payments:review';
  const grants = user?.id ? await resolvePermissions(user) : [];
  const access = user?.id ? await tx.recipients.access(recipientId, user.id) : null;
  if (!grants.includes('panel:access') || !grants.includes(permission) || !access?.[capability])
    throw new AppError('No tienes permiso para este destinatario', 403, 'FORBIDDEN');
}
