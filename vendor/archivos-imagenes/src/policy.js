import { AppError } from '@base/usuarios-acceso';
export const supportedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'];
export function filePolicy({ maxBytes = 6 * 1024 * 1024, allowedTypes = supportedTypes, ttlSeconds = 120 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 100 * 1024 * 1024
      || !Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3600
      || !Array.isArray(allowedTypes) || !allowedTypes.length || allowedTypes.some(t => !supportedTypes.includes(t))) {
    throw new Error('Invalid file policy');
  }
  return { maxBytes, allowedTypes: [...new Set(allowedTypes)], ttlSeconds };
}
export function validateFile({ body, name, contentType, visibility }, policy) {
  if (!Buffer.isBuffer(body) || !body.length) throw new AppError('El archivo está vacío', 400, 'EMPTY_FILE');
  if (body.length > policy.maxBytes) throw new AppError('Archivo demasiado grande', 413, 'FILE_TOO_LARGE');
  if (typeof name !== 'string' || !name.trim() || name.length > 180 || /[\\/\x00-\x1f\x7f]/.test(name))
    throw new AppError('Nombre de archivo inválido', 400, 'INVALID_FILENAME');
  if (!['public', 'private'].includes(visibility)) throw new AppError('Visibilidad inválida', 400, 'INVALID_VISIBILITY');
  const extensions = { 'image/png': /\.png$/i, 'image/jpeg': /\.jpe?g$/i, 'image/webp': /\.webp$/i, 'application/pdf': /\.pdf$/i, 'text/plain': /\.txt$/i };
  let signature = false;
  if (contentType === 'image/png') signature = body.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (contentType === 'image/jpeg') signature = body[0] === 255 && body[1] === 216 && body[2] === 255;
  if (contentType === 'image/webp') signature = body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP';
  if (contentType === 'application/pdf') signature = body.toString('ascii', 0, 5) === '%PDF-';
  if (contentType === 'text/plain') {
    try { const text = new TextDecoder('utf-8', { fatal: true }).decode(body); signature = !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text); } catch { /* invalid UTF-8 */ }
  }
  if (!policy.allowedTypes.includes(contentType) || !extensions[contentType]?.test(name) || !signature)
    throw new AppError('Tipo o contenido no permitido. Revisa la extensión y el formato.', 415, 'FILE_TYPE_NOT_ALLOWED');
}
