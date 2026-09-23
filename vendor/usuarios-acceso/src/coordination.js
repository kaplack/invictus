import { AppError } from './http/errors.js';

// Primera política: serialización conservadora de escrituras de integración.
// Misma clave en todas las conexiones, adquirida ANTES de leer para modificar.
export async function runCoordinated(database, work) {
  const execute = async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(718204, 5)::text`;
    return work(tx);
  };
  return typeof database.$transaction === 'function'
    ? database.$transaction(execute, { maxWait: 10000, timeout: 20000 }) : execute(database);
}

export async function assertLiveFiles(database, ids) {
  const selected = [...new Set(ids.filter(Boolean))];
  if (!selected.length) return;
  const rows = await database.storedFile.findMany({ where: { id: { in: selected }, deletedAt: null }, select: { id: true } });
  if (rows.length !== selected.length) throw new AppError('Archivo inexistente o eliminado', 409, 'FILE_UNAVAILABLE');
}

export async function assertFileUnreferenced(db, id) {
  const checks = [
    ['manualPayment', { proofFileId: id }], ['paymentRecipient', { qrFileId: id }], ['paymentOperation', { qrFileId: id }],
    ['shopProduct', { imageFileId: id }], ['eventBenefit', { imageFileId: id }],
    ['event', { OR: [{ primaryImageFileId: id }, { bannerImageFileId: id }, { galleryFileIds: { array_contains: [id] } }] }],
    ['participantProfile', { OR: [{ avatarFileId: id }, { documentFileIds: { array_contains: [id] } }] }],
    ['eventRegistration', { proofFileId: id }]
  ];
  for (const [model, where] of checks) {
    if (db[model] && await db[model].findFirst({ where, select: { id: true } }))
      throw new AppError('Archivo asociado a un registro', 409, 'FILE_IN_USE');
  }
}
