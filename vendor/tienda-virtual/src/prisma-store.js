import { runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
import { StoreError } from './errors.js';
const productView = row => row && ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  variants: row.variants.map(({ productId, position, ...variant }) => variant) });
const include = { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } };
function productData(p) {
  return { categoryId: p.categoryId ?? null, name: p.name, description: p.description,
    imageFileId: p.imageFileId ?? null, priceCents: p.priceCents, published: p.published };
}
const variantsData = variants => variants.map((v, position) => ({ id: v.id, name: v.name, sku: v.sku, priceCents: v.priceCents, stock: v.stock, position }));
const cartView = row => row && ({ cartId: row.id, userId: row.userId, items: row.items, totalCents: row.totalCents, currency: row.currency });

// Accepts a PrismaClient or a transaction client. No connection is opened here.
export function createPrismaStore(database) {
  return {
    categories: {
      get: id => database.shopCategory.findUnique({ where: { id } }),
      list: () => database.shopCategory.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      create: c => database.shopCategory.create({ data: { id: c.id, name: c.name, slug: c.slug } })
    },
    products: {
      async get(id) { return productView(await database.shopProduct.findUnique({ where: { id }, include })); },
      async list({ categoryId } = {}) { return (await database.shopProduct.findMany({ where: categoryId ? { categoryId } : {}, include, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(productView); },
      async create(p) { return runCoordinated(database, async tx => { await assertLiveFiles(tx, [p.imageFileId]); return productView(await tx.shopProduct.create({ data: { id: p.id, ...productData(p), createdAt: p.createdAt ? new Date(p.createdAt) : undefined, variants: { create: variantsData(p.variants) } }, include })); }); },
      async update(id, p) {
        return runCoordinated(database, async tx => {
          await assertLiveFiles(tx, [p.imageFileId]);
          const product = await tx.shopProduct.findUnique({ where: { id } });
          if (product && (!Number.isInteger(p.revision) || p.revision !== product.revision))
            throw new StoreError('El producto cambió; vuelve a cargarlo antes de editar', 409, 'STALE_PRODUCT');
          const current = await tx.shopVariant.findMany({ where: { productId: id } });
          // No reemplazar cantidades/variantes mientras sus pedidos reservan stock.
          if (tx.commerceOrder) for (const variant of current) {
            if (await tx.commerceOrder.findFirst({ where: { status: { in: ['pending', 'accepted'] }, items: { array_contains: [{ productId: variant.id }] } }, select: { id: true } }))
              throw new StoreError('Producto con reservas activas; termina o cancela sus pedidos antes de editar', 409, 'ACTIVE_RESERVATIONS');
          }
          return productView(await tx.shopProduct.update({ where: { id }, data: { ...productData(p), revision: { increment: 1 },
            variants: { deleteMany: {}, create: variantsData(p.variants) } }, include }));
        });
      }
    },
    carts: {
      async get(id) { return cartView(await database.shopCart.findUnique({ where: { id } })); },
      async save(id, c) {
        const data = { userId: c.userId ?? null, items: c.items, totalCents: c.totalCents, currency: c.currency };
        return runCoordinated(database, async tx => cartView(await tx.shopCart.upsert({ where: { id }, create: { id, ...data }, update: data })));
      }
    }
  };
}
