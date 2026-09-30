import { Router } from 'express';
import { sendFileStream } from '@base/archivos-imagenes';

export function createEventSetupRouter({ service, requireAuth }) {
  const router = Router();
  router.get('/disciplines', async (req, res) => res.json(await service.disciplines()));
  router.use(['/events/:id/setup', '/events/:id/categories', '/events/:id/payment-methods', '/teams/:id/payment-methods'], requireAuth);
  router.get('/events/:id/setup', async (req, res) => res.json(await service.get(req.user, req.params.id)));
  router.post('/events/:id/categories', async (req, res) => res.status(201).json(await service.category(req.user, req.params.id, null, req.body)));
  router.put('/events/:id/categories/:categoryId', async (req, res) => res.json(await service.category(req.user, req.params.id, req.params.categoryId, req.body)));
  router.put('/events/:id/payment-methods', async (req, res) => res.json(await service.selectMethods(req.user, req.params.id, req.body)));
  router.get('/teams/:id/payment-methods', async (req, res) => res.json(await service.methods(req.user, req.params.id)));
  router.post('/teams/:id/payment-methods', async (req, res) => res.status(201).json(await service.method(req.user, req.params.id, null, req.body)));
  router.put('/teams/:id/payment-methods/:methodId', async (req, res) => res.json(await service.method(req.user, req.params.id, req.params.methodId, req.body)));
  router.get('/teams/:id/payment-methods/:methodId/qr', async (req, res) => {
    const { file, stream } = await service.qr(req.user, req.params.id, req.params.methodId);
    res.set({ 'Content-Type': file.contentType, 'Content-Length': String(file.size), 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Referrer-Policy': 'no-referrer' });
    await sendFileStream(stream, res);
  });
  return router;
}
