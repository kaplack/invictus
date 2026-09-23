import { Router } from 'express';
export function createOrderRouter({ service, requireAuth }) {
  const router = Router();
  router.use(requireAuth);
  router.get('/products', async (req, res) => res.json(await service.catalog()));
  router.get('/admin', async (req, res) => res.json({ orders: await service.list(req.user, { admin: true, offset: Number(req.query.offset || 0) }) }));
  router.get('/admin/:id', async (req, res) => res.json({ order: await service.detail(req.user, req.params.id, true) }));
  router.patch('/admin/:id/status', async (req, res) => res.json({ order: await service.transition(req.user, req.params.id, req.body) }));
  router.get('/', async (req, res) => res.json({ orders: await service.list(req.user, { offset: Number(req.query.offset || 0) }) }));
  router.post('/', async (req, res) => res.status(201).json({ order: await service.create(req.user, req.body) }));
  router.get('/:id', async (req, res) => res.json({ order: await service.detail(req.user, req.params.id) }));
  return router;
}
