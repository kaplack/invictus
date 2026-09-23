import { randomUUID } from 'node:crypto';
import { AppError } from '@base/usuarios-acceso';

export const orderTransitions = Object.freeze({ pending: ['accepted', 'cancelled'], accepted: ['completed', 'cancelled'], completed: [], cancelled: [] });
export const missingOrder = () => new AppError('Pedido no disponible', 404, 'ORDER_NOT_FOUND');
export function requireOwner(order, user) { if (!order || order.ownerId !== user?.id) throw missingOrder(); }
export async function requirePermission(user, permission, resolvePermissions) {
  const grants = user?.id ? await resolvePermissions(user) : [];
  if (!grants.includes('panel:access') || !grants.includes(permission)) throw new AppError('No tienes permiso para esta acción', 403, 'FORBIDDEN');
}
export function strictInput(input, keys) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !keys.includes(k)))
    throw new AppError('Datos no válidos. Los precios y totales los calcula el servidor.', 400, 'INVALID_INPUT');
}
export function createOrderService({ store, products = [], productReader, currency = 'PEN', resolvePermissions, onCreated = async () => {}, onTransition = async () => {}, coordinatedCheckout = false }) {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Moneda inválida');
  if (productReader && (typeof productReader.list !== 'function' || typeof productReader.get !== 'function')) throw new TypeError('Lector de productos inválido');
  if (productReader && products.length) throw new TypeError('Usa un catálogo fijo o un lector, no ambos');
  const catalog = products.map(p => {
    if (!p.id || !p.name || !Number.isSafeInteger(p.unitPriceCents) || p.unitPriceCents < 1 || p.unitPriceCents > 10000000) throw new Error('Producto inválido');
    return Object.freeze({ id: p.id, name: p.name, unitPriceCents: p.unitPriceCents });
  });
  if (new Set(catalog.map(p => p.id)).size !== catalog.length) throw new Error('Productos duplicados');
  return {
    catalog: () => productReader ? productReader.list().then(products => ({ products, currency, transitions: orderTransitions })) : ({ products: catalog, currency, transitions: orderTransitions }),
    async create(user, input) {
      if (!user?.id) throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
      strictInput(input, ['items']);
      if (!Array.isArray(input.items) || !input.items.length || input.items.length > 30) throw new AppError('Selecciona entre 1 y 30 productos', 400, 'INVALID_ITEMS');
      return store.run(null, async tx => {
      const seen = new Set();
      const items = [];
      for (const item of input.items) {
        strictInput(item, ['productId', 'quantity']);
        if (typeof item.productId !== 'string' || seen.has(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new AppError('Producto o cantidad inválida', 400, 'INVALID_ITEMS');
        const product = productReader ? await productReader.get(item.productId, { tx, quantity: item.quantity }) : catalog.find(p => p.id === item.productId);
        if (!product || product.id !== item.productId || !product.name || !Number.isSafeInteger(product.unitPriceCents) || product.unitPriceCents < 1 || product.unitPriceCents > 10000000) throw new AppError('Producto o precio inválido', 400, 'INVALID_ITEMS');
        seen.add(product.id);
        items.push({ productId: product.id, name: product.name, unitPriceCents: product.unitPriceCents, quantity: item.quantity, totalCents: product.unitPriceCents * item.quantity });
      }
      const totalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
      if (totalCents > 2000000000) throw new AppError('El pedido supera el importe permitido', 400, 'INVALID_TOTAL');
        const order = await tx.orders.create({ id: randomUUID(), ownerId: user.id, status: 'pending', items, totalCents, currency, createdAt: new Date() });
        await onCreated(tx, order);
        return order;
      });
    },
    async list(user, { admin = false, offset = 0 } = {}) {
      if (admin) await requirePermission(user, 'orders:manage', resolvePermissions);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new AppError('Paginación inválida', 400, 'INVALID_OFFSET');
      return store.listOrders(admin ? undefined : user.id, offset);
    },
    async detail(user, id, admin = false) {
      if (admin) await requirePermission(user, 'orders:manage', resolvePermissions);
      return store.run(id, async tx => {
        const order = await tx.orders.find(id);
        if (!admin) requireOwner(order, user);
        if (!order) throw missingOrder();
        return order;
      });
    },
    async transition(user, id, input) {
      await requirePermission(user, 'orders:manage', resolvePermissions);
      strictInput(input, ['status']);
      return store.run(id, async tx => {
        const order = await tx.orders.find(id);
        if (!order) throw missingOrder();
        if (!coordinatedCheckout && tx.database?.commerceCheckout && await tx.database.commerceCheckout.findUnique({ where: { orderId: id } }))
          throw new AppError('Usa el coordinador de checkout', 409, 'COORDINATOR_REQUIRED');
        if (!orderTransitions[order.status]?.includes(input.status)) throw new AppError('Transición de pedido no permitida', 409, 'INVALID_ORDER_TRANSITION');
        const updated = await tx.orders.update(id, { status: input.status });
        await onTransition(tx, updated);
        return updated;
      });
    }
  };
}
