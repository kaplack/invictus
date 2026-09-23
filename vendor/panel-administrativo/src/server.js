import { Router } from 'express';
import { AppError } from '@base/usuarios-acceso';

// Resolver únicamente con datos de confianza del servidor; nunca desde el cuerpo HTTP.
export function createPanelAccess({ resolvePermissions }) {
  if (typeof resolvePermissions !== 'function') throw new TypeError('Se requiere resolvePermissions');
  const requirePermissions = (...required) => async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
      const permissions = await resolvePermissions(req.user);
      if (!Array.isArray(permissions) || !required.every(p => permissions.includes(p)))
        throw new AppError('No tienes permiso para acceder a esta sección', 403, 'FORBIDDEN');
      req.panelPermissions = permissions;
      next();
    } catch (error) { next(error); }
  };
  function router({ requireAuth }) {
    const routes = Router();
    routes.get('/session', requireAuth, requirePermissions('panel:access'), (req, res) => {
      res.json({ user: req.user, permissions: req.panelPermissions });
    });
    return routes;
  }
  return { requirePermissions, router };
}
