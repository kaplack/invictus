import { Router } from 'express';
import { pipeline } from 'node:stream/promises';
export function createPaymentRouter({ service, recipients, requireAuth }) {
  const router = Router();
  router.use(requireAuth);
  router.get('/methods', (req, res) => res.json({ methods: service.methods }));
  if (recipients) {
    router.get('/recipients', async (req, res) => res.json({ recipients: await recipients.list(req.user) }));
    router.patch('/recipients/:id', async (req, res) => res.json({ recipient: await recipients.update(req.user, req.params.id, req.body) }));
  }
  for (const admin of [false, true]) {
    const base = admin ? '/operations/admin' : '/operations';
    router.get(base, async (req, res) => res.json({ operations: await service.operations(req.user, admin, Number(req.query.offset || 0)) }));
    router.get(base + '/:id', async (req, res) => res.json(await service.operation(req.user, req.params.id, admin)));
    router.get(base + '/:id/qr', async (req, res) => {
      const { file, stream } = await service.qr(req.user, req.params.id, admin);
      res.set({ 'Content-Type': file.contentType, 'Content-Length': String(file.size), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
      await pipeline(stream, res);
    });
  }
  for (const admin of [false, true]) {
    const prefix = admin ? '/admin' : '';
    router.get(prefix + '/:orderId', async (req, res) => res.json({ payments: await service.list(req.user, req.params.orderId, admin) }));
    router.get(prefix + '/:orderId/:paymentId/proof', async (req, res) => {
      const { file, stream } = await service.proof(req.user, req.params.orderId, req.params.paymentId, admin);
      res.set({ 'Content-Type': file.contentType, 'Content-Length': String(file.size), 'Content-Disposition': 'attachment; filename="comprobante"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
      await pipeline(stream, res);
    });
  }
  router.post('/:orderId', async (req, res) => res.status(201).json({ payment: await service.register(req.user, req.params.orderId, req.body) }));
  router.patch('/admin/:orderId/:paymentId', async (req, res) => res.json({ payment: await service.review(req.user, req.params.orderId, req.params.paymentId, req.body) }));
  return router;
}
