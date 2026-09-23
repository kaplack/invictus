import { runCoordinated, assertFileUnreferenced } from '@base/usuarios-acceso/contracts';
export function createPrismaFileRepository(database) {
  return {
    create: data => database.storedFile.create({ data }),
    find: id => database.storedFile.findUnique({ where: { id } }),
    list: (ownerId, skip = 0) => database.storedFile.findMany({ where: { ownerId, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip, take: 50 }),
    // Keep a tombstone before deleting bytes: failed storage deletion never restores access.
    markDeleted: id => runCoordinated(database, async tx => {
      await assertFileUnreferenced(tx, id);
      return tx.storedFile.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
    })
  };
}
