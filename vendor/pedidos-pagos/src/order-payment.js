import { openPaymentOperation } from '@base/pagos-manuales';
export const SHOP_RECIPIENT_ID = '10000000-0000-4000-8000-000000000001';
// Adaptador de pedidos: nunca recibe recipientId del comprador.
export function orderPaymentHooks({ recipientId = SHOP_RECIPIENT_ID } = {}) {
  return {
    onCreated: (tx, order) => openPaymentOperation(tx, { id: order.id, sourceType: 'order', sourceId: order.id,
      payerId: order.ownerId, recipientId, amountCents: order.totalCents, currency: order.currency }),
    onTransition: (tx, order) => tx.operations.update(order.id, {
      acceptingPayments: !['completed', 'cancelled'].includes(order.status), acceptingReviews: order.status !== 'cancelled'
    })
  };
}
