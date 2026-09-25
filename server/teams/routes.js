import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

export function createTeamRouter({ service, requireAuth }) {
  const router = Router();
  router.use(requireAuth);
  const limit = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: req => req.user.id,
    message: { error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.' } } });
  router.get('/', async (req, res) => res.json(await service.list(req.user, req.query.offset)));
  router.get('/event-options', async (req, res) => res.json(await service.list(req.user, req.query.offset, true)));
  router.post('/', limit, async (req, res) => res.status(201).json(await service.create(req.user, req.body)));
  router.get('/:id', async (req, res) => res.json(await service.get(req.user, req.params.id)));
  router.patch('/:id', async (req, res) => res.json(await service.update(req.user, req.params.id, req.body)));
  router.get('/:id/members', async (req, res) => res.json(await service.members(req.user, req.params.id, req.query.offset)));
  router.post('/:id/members', limit, async (req, res) => res.status(201).json(await service.add(req.user, req.params.id, req.body)));
  router.patch('/:id/members/:memberId', async (req, res) => res.json(await service.changeRole(req.user, req.params.id, req.params.memberId, req.body)));
  router.delete('/:id/members/:memberId', async (req, res) => { await service.remove(req.user, req.params.id, req.params.memberId); res.sendStatus(204); });
  return router;
}
