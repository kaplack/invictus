import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authValidation } from './auth.validation.js';

export function createAuthRouter({ authService, authMiddleware, cookieName, cookieOptions }) {
  const router = Router();
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos; prueba más tarde' },
      }),
  });

  router.post('/register', authLimiter, async (req, res, next) => {
    try {
      const result = await authService.register(authValidation.register(req.body));
      res.cookie(cookieName, result.token, { ...cookieOptions, expires: result.expiresAt });
      res.status(201).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', authLimiter, async (req, res, next) => {
    try {
      const result = await authService.login(authValidation.login(req.body));
      res.cookie(cookieName, result.token, { ...cookieOptions, expires: result.expiresAt });
      res.json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await authService.logout(req.cookies[cookieName]);
      res.clearCookie(cookieName, cookieOptions);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get('/session', authMiddleware.requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
