import { AppError } from './http/errors.js';
export { runCoordinated, assertLiveFiles, assertFileUnreferenced } from './coordination.js';

export function requirePort(value, methods, label) {
  for (const path of methods) {
    const member = path.split('.').reduce((object, key) => object?.[key], value);
    if (typeof member !== 'function') throw new TypeError(`${label}.${path} debe ser una función`);
  }
}
export function parseInput(schema, value, ErrorType = AppError) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ErrorType('Datos inválidos: revisa tipos, campos y límites permitidos', 400, 'INVALID_INPUT');
  return result.data;
}
export function normalizePublicBaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError('publicBaseUrl debe ser una URL HTTP(S) absoluta'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TypeError('publicBaseUrl no admite credenciales, query ni fragmento');
  }
  return url.href.replace(/\/$/, '');
}
export function sendDomainError(res, error, { legacy = false } = {}) {
  const known = error instanceof AppError && Number.isInteger(error.status) && error.status >= 400 && error.status < 500;
  const conflict = ['P2002', 'P2003', 'P2025'].includes(error?.code);
  const invalid = error?.code === 'P2023';
  const status = known ? error.status : conflict ? 409 : invalid ? 400 : 500;
  const code = known ? error.code : conflict ? 'DATA_CONFLICT' : invalid ? 'INVALID_INPUT' : 'INTERNAL_ERROR';
  const message = known ? error.message : conflict ? 'Los datos entran en conflicto con el estado actual' : invalid ? 'Identificador o dato inválido' : 'Ocurrió un error inesperado';
  return res.status(status).json(legacy ? { error: code, message } : { error: { code, message } });
}
