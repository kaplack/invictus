import express from 'express';
import { pipeline } from 'node:stream/promises';
import { AppError } from '@base/usuarios-acceso';
export function createFileRouter({ service, requireAuth }) {
  const router = express.Router();
  async function content(req, res, publicOnly) {
    const { file, stream } = await service.content(req.params.id, req.user, req.query, publicOnly);
    res.set({ 'Content-Type': file.contentType, 'Content-Length': String(file.size),
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': `${file.contentType.startsWith('image/') ? 'inline' : 'attachment'}; filename="file"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}` });
    await pipeline(stream, res);
  }
  router.get('/:id/public', (req, res) => content(req, res, true));
  router.use(requireAuth);
  router.get('/policy', (req, res) => res.json(service.policy));
  router.get('/', async (req, res) => {
    const skip = Number(req.query.offset ?? 0);
    if (!Number.isSafeInteger(skip) || skip < 0) throw new AppError('Paginación inválida', 400, 'INVALID_OFFSET');
    res.json({ files: await service.list(req.user, skip) });
  });
  router.post('/', express.raw({ type: () => true, limit: service.policy.maxBytes, inflate: false }), async (req, res) => {
    let name;
    try { name = decodeURIComponent(req.get('x-file-name') ?? ''); } catch { throw new AppError('Nombre inválido', 400, 'INVALID_FILENAME'); }
    res.status(201).json({ file: await service.upload(req.user, { name, body: req.body,
      contentType: (req.get('content-type') ?? '').split(';')[0].trim().toLowerCase(), visibility: req.get('x-file-visibility') ?? 'private' }) });
  });
  router.get('/:id', async (req, res) => res.json({ file: await service.metadata(req.params.id, req.user) }));
  router.get('/:id/access', async (req, res) => {
    const access = await service.access(req.params.id, req.user);
    res.json({ url: `${req.baseUrl}/${access.path}`, expiresAt: access.expiresAt });
  });
  router.get('/:id/content', (req, res) => content(req, res, false));
  router.delete('/:id', async (req, res) => { await service.remove(req.params.id, req.user); res.sendStatus(204); });
  router.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return next(new AppError('Archivo demasiado grande', 413, 'FILE_TOO_LARGE'));
    if (error.type === 'encoding.unsupported') return next(new AppError('No se admiten cargas comprimidas', 415, 'UNSUPPORTED_ENCODING'));
    next(error);
  });
  return router;
}
