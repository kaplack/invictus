import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
export function createTeamRouter({
  service,
  requireAuth
}) {
  const router = Router();
  router.get('/public', async (req, res) => res.json(await service.publicList(req.query.q, req.query.offset, req.query.disciplineId, req.query.sort)));
  router.get('/public/:id', async (req, res) => res.json(await service.publicGet(req.params.id)));
  router.use(requireAuth);
  const limit = rateLimit({
    windowMs: 60000,
    limit: 30,
    keyGenerator: req => req.user.id,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.'
      }
    }
  });
  router.get('/', async (req, res) => res.json(await service.list(req.user, req.query.offset)));
  router.get('/event-options', async (req, res) => res.json(await service.list(req.user, req.query.offset, true)));
  router.post('/', limit, async (req, res) => res.status(201).json(await service.create(req.user, req.body)));
  router.get('/explore', async (req, res) => res.json(await service.explore(req.user, req.query.q, req.query.offset)));
  router.get('/invitations', async (req, res) => res.json(await service.invitations(req.user)));
  router.post('/:id/join', limit, async (req, res) => res.json(await service.join(req.user, req.params.id)));
  router.post('/:id/invitations', limit, async (req, res) => res.status(201).json(await service.invite(req.user, req.params.id, req.body)));
  router.get('/:id/requests', async (req, res) => res.json(await service.requests(req.user, req.params.id)));
  router.post('/:id/admissions/:admissionId', limit, async (req, res) => res.json(await service.decide(req.user, req.params.id, req.params.admissionId, req.body)));
  router.get('/:id/events', async (req, res) => res.json(await service.events(req.user, req.params.id)));
  router.get('/:id', async (req, res) => res.json(await service.get(req.user, req.params.id)));
  router.patch('/:id', async (req, res) => res.json(await service.update(req.user, req.params.id, req.body)));
  router.get('/:id/members', async (req, res) => res.json(await service.members(req.user, req.params.id, req.query.offset)));
  router.post('/:id/members', limit, async (req, res) => res.status(201).json(await service.add(req.user, req.params.id, req.body)));
  router.patch('/:id/members/:memberId', async (req, res) => res.json(await service.changeRole(req.user, req.params.id, req.params.memberId, req.body)));
  router.delete('/:id/members/:memberId', async (req, res) => {
    await service.remove(req.user, req.params.id, req.params.memberId);
    res.sendStatus(204);
  });
  return router;
}
