export class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error instanceof AppError ? error.status : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const message = status === 500 ? 'Ocurrió un error inesperado' : error.message;
  const details = status < 500 && error instanceof AppError ? error.details : undefined;

  if (status === 500) console.error('Error interno de acceso');
  return res.status(status).json({ error: { code, message, ...(details && { details }) } });
}
