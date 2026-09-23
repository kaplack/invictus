import { AppError } from '@base/usuarios-acceso';
import { runCoordinated, assertFileUnreferenced } from '@base/usuarios-acceso/contracts';
const uuid = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function createPrismaCommerceStore(database) {
  const context = db => ({
    database: db,
    orders: {
      find: id => db.commerceOrder.findUnique({ where: { id } }),
      create: data => db.commerceOrder.create({ data }),
      update: (id, data) => db.commerceOrder.update({ where: { id }, data })
    },
    operations: {
      find: id => db.paymentOperation.findUnique({ where: { id } }),
      findSource: (sourceType, sourceId) => db.paymentOperation.findUnique({ where: { sourceType_sourceId: { sourceType, sourceId } } }),
      create: data => db.paymentOperation.create({ data }),
      update: (id, data) => db.paymentOperation.update({ where: { id }, data }),
      list: (filter, skip) => db.paymentOperation.findMany({ where: filter.payerId ? { payerId: filter.payerId } : { recipientId: { in: filter.recipientIds } }, skip, take: 50, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] })
    },
    recipients: {
      async lock(id) {
        if (!uuid(id)) return null;
        await db.$queryRaw`SELECT id FROM payment_recipients WHERE id = ${id}::uuid FOR UPDATE`;
        return db.paymentRecipient.findUnique({ where: { id } });
      },
      create: data => db.paymentRecipient.create({ data }),
      update: (id, data) => db.paymentRecipient.update({ where: { id }, data }),
      access: (recipientId, userId) => uuid(recipientId) ? db.recipientMember.findUnique({ where: { recipientId_userId: { recipientId, userId } } }) : null,
      grant: data => db.recipientMember.upsert({ where: { recipientId_userId: { recipientId: data.recipientId, userId: data.userId } }, create: data, update: { manage: data.manage, review: data.review } }),
      async list(userId, capabilities) {
        const rows = await db.recipientMember.findMany({ where: { userId, OR: [...(capabilities.manage ? [{ manage: true }] : []), ...(capabilities.review ? [{ review: true }] : [])] }, include: { recipient: true } });
        return rows.map(r => ({ ...r.recipient, canManage: Boolean(capabilities.manage && r.manage), canReview: Boolean(capabilities.review && r.review) }));
      }
    },
    payments: {
      list: operationId => db.manualPayment.findMany({ where: { operationId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
      usesFile: async proofFileId => Boolean(await db.manualPayment.findFirst({ where: { proofFileId } })),
      create: data => db.manualPayment.create({ data }),
      update: (id, data) => db.manualPayment.update({ where: { id }, data })
    },
    results: {
      create: data => db.paymentResult.create({ data }),
      list: operationId => db.paymentResult.findMany({ where: { operationId }, orderBy: { reviewedAt: 'asc' } })
    },
    files: { async lock(id) {
      if (!uuid(id)) return null;
      await db.$queryRaw`SELECT id FROM stored_files WHERE id = ${id}::uuid FOR UPDATE`;
      return db.storedFile.findUnique({ where: { id } });
    } }
  });
  return {
    async run(id, fn) {
      if (id !== null && !uuid(id)) throw new AppError('Operación no disponible', 404, 'OPERATION_NOT_FOUND');
      return runCoordinated(database, async db => {
        // Orden único: pedido (si existe), operación, destinatario, archivo.
        if (id) {
          await db.$queryRaw`SELECT id FROM commerce_orders WHERE id = ${id}::uuid FOR UPDATE`;
          await db.$queryRaw`SELECT id FROM payment_operations WHERE id = ${id}::uuid FOR UPDATE`;
        }
        return fn(context(db));
      });
    },
    listOrders: (ownerId, skip) => database.commerceOrder.findMany({ where: ownerId ? { ownerId } : {}, skip, take: 50, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] }),
    async protectDeletion(id) {
      return runCoordinated(database, async db => {
        await context(db).files.lock(id);
        await assertFileUnreferenced(db, id);
        return db.storedFile.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
      });
    }
  };
}
export function protectReceiptRepository(repository, store) {
  return { ...repository, markDeleted: id => store.protectDeletion(id, () => repository.markDeleted(id)) };
}
