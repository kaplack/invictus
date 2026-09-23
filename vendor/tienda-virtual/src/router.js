import express from 'express';
import { StoreError } from './errors.js';
import { sendDomainError, requirePort } from '@base/usuarios-acceso/contracts';
export function createStoreRouter({ service, getUser = req => req.user ?? null, getCartContext = req => ({ userId: getUser(req)?.id ?? null }), legacyErrors = false }) {
  requirePort(service, ['listCatalog','listAdmin','createProduct','updateProduct','addToCart','getCart','checkoutSummary'], 'service');
  const router = express.Router(); const run = fn => async (req, res) => { try { res.json(await fn(req, res)); } catch (e) { return sendDomainError(res,e,{legacy:legacyErrors}); } };
  router.get('/catalog', run(req => service.listCatalog(req.query))); router.get('/admin/products', run(req => service.listAdmin(getUser(req))));
  router.post('/admin/products', run(req => service.createProduct(getUser(req), req.body))); router.patch('/admin/products/:id', run(req => service.updateProduct(getUser(req), req.params.id, req.body)));
  router.post('/cart', run(req => service.addToCart({ ...getCartContext(req), cartId: req.body?.cartId }, req.body?.items))); router.get('/cart/:id', run(req => service.getCart(req.params.id, getCartContext(req)))); router.post('/cart/:id/summary', run(req => service.checkoutSummary(req.params.id, getCartContext(req))));
  return router;
}
