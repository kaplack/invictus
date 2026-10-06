import { Router } from 'express';
import { sendFileStream } from '@base/archivos-imagenes';
export function createRegistrationRouter({ service, requireAuth }) {
  const r = Router();
  r.get('/events/:id/my-registration', requireAuth, async (req,res) => res.json(await service.mine(req.user,req.params.id)));
  r.get('/events/:id/registration-options', requireAuth, async (req,res) => res.json(await service.options(req.user,req.params.id)));
  r.get('/events/:id/registrations', requireAuth, async (req,res) => res.json(await service.list(req.user,req.params.id,req.query)));
  r.get('/registrations/:id', requireAuth, async (req,res) => res.json(await service.get(req.user,req.params.id)));
  r.post('/registrations/:id/resubmit', requireAuth, async (req,res) => res.json(await service.resubmit(req.user,req.params.id,req.body)));
  r.post('/registrations/:id/review', requireAuth, async (req,res) => res.json(await service.review(req.user,req.params.id,req.body)));
  const send = async (res, result, attachment = false) => {
    res.set({ 'Content-Type': result.file.contentType, 'Content-Length': String(result.file.size), 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Referrer-Policy': 'no-referrer',
      ...(attachment ? { 'Content-Disposition': 'attachment; filename="comprobante"' } : {}) });
    await sendFileStream(result.stream,res);
  };
  r.get('/events/:id/payment-methods/:methodId/qr', requireAuth, async (req,res) => send(res,await service.optionQr(req.user,req.params.id,req.params.methodId)));
  r.get('/registrations/:id/qr', requireAuth, async (req,res) => send(res,await service.qr(req.user,req.params.id)));
  r.get('/registrations/:id/payments/:paymentId/proof', requireAuth, async (req,res) => send(res,await service.proof(req.user,req.params.id,req.params.paymentId),true));
  return r;
}
