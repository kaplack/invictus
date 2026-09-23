import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '@base/usuarios-acceso';
import { filePolicy, validateFile } from './policy.js';

export function createFileService({ repository, storage, policy: options, signingKey = randomBytes(32), now = Date.now }) {
  const policy = filePolicy(options);
  if (Buffer.byteLength(signingKey) < 32) throw new Error('File signing key must have at least 32 bytes');
  const fail = () => { throw new AppError('Archivo no disponible', 404, 'FILE_NOT_FOUND'); };
  const dto = f => ({ id: f.id, name: f.name, contentType: f.contentType, size: f.size, visibility: f.visibility, createdAt: f.createdAt });
  async function find(id, user, ownerOnly = false) {
    if (!/^[a-f0-9-]{36}$/.test(id)) return fail();
    const file = await repository.find(id);
    if (!file || file.deletedAt || ((ownerOnly || file.visibility === 'private') && file.ownerId !== user?.id)) return fail();
    return file;
  }
  const sign = (file, expires) => createHmac('sha256', signingKey).update(`${file.id}:${file.ownerId}:${expires}`).digest('hex');
  return {
    policy,
    async assertOwned(id, ownerId, { visibility, image = false } = {}) {
      const file = await find(id, { id: ownerId }, true);
      if ((visibility && file.visibility !== visibility) || (image && !file.contentType.startsWith('image/')))
        throw new AppError('Archivo incompatible con este uso', 400, 'INVALID_FILE_REFERENCE');
      return dto(file);
    },
    async upload(user, input) {
      if (!user?.id) throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
      validateFile(input, policy);
      const id = randomUUID();
      const file = { id, ownerId: user.id, key: id, name: input.name, contentType: input.contentType,
        size: input.body.length, visibility: input.visibility, createdAt: new Date(now()), deletedAt: null };
      await storage.put({ key: id, body: input.body, contentType: file.contentType, ownerId: user.id });
      try { await repository.create(file); }
      catch (error) { await storage.remove(id).catch(() => {}); throw error; }
      return dto(file);
    },
    async list(user, skip) { return (await repository.list(user.id, skip)).map(dto); },
    async metadata(id, user) { return dto(await find(id, user)); },
    async access(id, user) {
      const file = await find(id, user);
      if (file.visibility === 'public') return { path: `${id}/public`, expiresAt: null };
      const expires = Math.floor(now() / 1000) + policy.ttlSeconds;
      return { path: `${id}/content?expires=${expires}&signature=${sign(file, expires)}`, expiresAt: new Date(expires * 1000).toISOString() };
    },
    async content(id, user, query, publicOnly = false) {
      const file = await find(id, user);
      if (publicOnly && file.visibility !== 'public') return fail();
      if (file.visibility === 'private') {
        const { expires, signature } = query;
        if (typeof expires !== 'string' || !/^\d{1,12}$/.test(expires) || Number(expires) <= Math.floor(now() / 1000)
          || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)
          || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(file, expires), 'hex'))) {
          throw new AppError('El enlace ha caducado o es inválido. Genera otro.', 403, 'INVALID_FILE_LINK');
        }
      }
      return { file: dto(file), stream: await storage.get(file.key) };
    },
    async remove(id, user) {
      if (!/^[a-f0-9-]{36}$/.test(id)) return fail();
      // Tombstones allow the owner to retry failed object deletion without exposing bytes.
      const file = await repository.find(id);
      if (!file || file.ownerId !== user?.id) return fail();
      await repository.markDeleted(id);
      await storage.remove(file.key);
    }
  };
}
