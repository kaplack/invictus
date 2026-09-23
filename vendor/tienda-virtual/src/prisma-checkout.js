import { createHash } from 'node:crypto';
import { requirePort } from '@base/usuarios-acceso/contracts';
import { createPrismaStore } from './prisma-store.js';
import { createShopOrderReader } from './order-adapter.js';
import { StoreError } from './errors.js';

// Inyectar createOrderService y openPaymentOperation desde sus paquetes públicos.
export function createPrismaCheckout({ database, commerceStore, createOrderService, openPaymentOperation,
  recipientId, resolvePermissions, currency = 'PEN', policy }) {
  if (policy !== 'reserve-until-terminal') throw new TypeError('Selecciona policy: reserve-until-terminal');
  requirePort(commerceStore, ['run', 'listOrders'], 'commerceStore');
  if (!database.commerceCheckout || typeof createOrderService !== 'function' || typeof openPaymentOperation !== 'function'
    || typeof resolvePermissions !== 'function' || !recipientId || !/^[A-Z]{3}$/.test(currency)) throw new TypeError('Configuración de checkout incompleta');
  const reader = createShopOrderReader({ store: createPrismaStore(database),
    storeForTransaction: tx => createPrismaStore(tx.database), experimental: true });
  const serviceFor = tx => createOrderService({
    coordinatedCheckout: true,
    store: { run: (_id, work) => work(tx), listOrders: commerceStore.listOrders }, productReader: reader, currency, resolvePermissions,
    async onCreated(context, order) {
      for (const item of order.items) {
        const changed = await context.database.shopVariant.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (changed.count !== 1) throw new StoreError('Stock insuficiente', 409, 'STOCK_EXCEEDED');
        const variant = await context.database.shopVariant.findUnique({ where: { id: item.productId }, select: { productId: true } });
        await context.database.shopProduct.update({ where: { id: variant.productId }, data: { revision: { increment: 1 } } });
      }
      await openPaymentOperation(context, { id: order.id, sourceType: 'order', sourceId: order.id,
        payerId: order.ownerId, recipientId, amountCents: order.totalCents, currency: order.currency });
    },
    async onTransition(context, order) {
      const payments = await context.payments.list(order.id);
      const paid = payments.some(p => p.status === 'verified');
      if (order.status === 'cancelled') {
        if (paid) throw new StoreError('Un pago verificado requiere devolución antes de cancelar', 409, 'REFUND_REQUIRED');
        for (const item of order.items) {
          const variant = await context.database.shopVariant.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          await context.database.shopProduct.update({ where: { id: variant.productId }, data: { revision: { increment: 1 } } });
        }
      }
      if (order.status === 'completed' && !paid) throw new StoreError('Verifica el pago antes de completar', 409, 'PAYMENT_REQUIRED');
      await context.operations.update(order.id, { acceptingPayments: !['cancelled', 'completed'].includes(order.status), acceptingReviews: !['cancelled', 'completed'].includes(order.status) });
    }
  });
  return {
    catalog: () => serviceFor(null).catalog(),
    async create(user, input) {
      if (!user?.id) throw new StoreError('Autenticación requerida', 401, 'UNAUTHENTICATED');
      if (!input || Object.keys(input).some(k => !['cartId', 'key'].includes(k)) || typeof input.cartId !== 'string'
        || typeof input.key !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(input.key)) throw new StoreError('Carrito o clave de reintento inválidos', 400, 'INVALID_INPUT');
      return commerceStore.run(null, async tx => {
        const cart = await tx.database.shopCart.findUnique({ where: { id: input.cartId } });
        if (!cart || cart.userId !== user.id) throw new StoreError('Carrito no encontrado', 404, 'NOT_FOUND');
        if (cart.currency !== currency) throw new StoreError('Moneda del carrito incompatible', 409, 'CURRENCY_CONFLICT');
        const items = cart.items.map(i => ({ productId: i.variantId, quantity: i.quantity })).sort((a,b) => a.productId.localeCompare(b.productId));
        const requestHash = createHash('sha256').update(JSON.stringify({ cartId: cart.id, currency, items })).digest('hex');
        const previous = await tx.database.commerceCheckout.findUnique({ where: { ownerId_key: { ownerId: user.id, key: input.key } } });
        if (previous) {
          if (previous.requestHash !== requestHash) throw new StoreError('Clave ya usada con otro contenido', 409, 'IDEMPOTENCY_CONFLICT');
          return tx.orders.find(previous.orderId);
        }
        const order = await serviceFor(tx).create(user, { items });
        await tx.database.commerceCheckout.create({ data: { ownerId: user.id, key: input.key, requestHash, orderId: order.id } });
        return order;
      });
    },
    async transition(user, id, input) {
      return commerceStore.run(id, async tx => {
        const service = serviceFor(tx);
        const order = await service.detail(user, id, true);
        if (!await tx.database.commerceCheckout.findUnique({ where: { orderId: id } })) throw new StoreError('Pedido fuera de esta política', 409, 'UNMANAGED_ORDER');
        if (!input || Object.keys(input).some(k => k !== 'status')) throw new StoreError('Entrada inválida', 400, 'INVALID_INPUT');
        if (order.status === input.status) return order;
        return service.transition(user, id, input);
      });
    },
    detail: (user, id, admin = false) => commerceStore.run(id, tx => serviceFor(tx).detail(user, id, admin)),
    list: (user, options) => commerceStore.run(null, tx => serviceFor(tx).list(user, options))
  };
}
