import { AppError } from '../http/errors.js';

export function createAuthMiddleware({ authService, cookieName, cookieOptions }) {
  async function requireAuth(req, res, next) {
    try {
      const authentication = await authService.authenticate(req.cookies[cookieName]);
      if (!authentication)
        throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
      req.user = authentication.user;
      if (authentication.rotatedToken) {
        res.cookie(cookieName, authentication.rotatedToken, {
          ...cookieOptions,
          expires: authentication.expiresAt,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(new AppError('No tienes permiso para esta acción', 403, 'FORBIDDEN'));
      }
      return next();
    };
  }

  return { requireAuth, requireRole };
}
