import { requirePort } from '@base/usuarios-acceso/contracts';
import { StoreError } from './errors.js';

// En pedidos, productId identifica la unidad vendible: ShopVariant.id.
export function createShopOrderReader({ store, storeForTransaction, experimental = false }) {
  requirePort(store, ['products.list'], 'store');
  if (typeof storeForTransaction !== 'function') throw new TypeError('storeForTransaction es obligatorio');
  const rows = async source => (await source.products.list({})).filter(p => p.published).flatMap(p => p.variants.map(v => ({
    id: v.id, name: `${p.name} — ${v.name}`, unitPriceCents: v.priceCents, stock: v.stock
  })));
  return {
    async list() { return (await rows(store)).map(({ stock, ...p }) => p); },
    async get(id, { tx, quantity }) {
      if (!experimental) throw new StoreError('Checkout pendiente de reservas y cancelación; solo pruebas locales explícitas', 409, 'INTEGRATION_NOT_READY');
      const source = storeForTransaction(tx);
      requirePort(source, ['products.list'], 'store transaccional');
      const product = (await rows(source)).find(p => p.id === id);
      if (product && quantity > product.stock) throw new StoreError('Stock insuficiente', 409, 'STOCK_EXCEEDED');
      return product || null;
    }
  };
}

// Solo prepara la entrada: no crea pedidos ni habilita un checkout sin reservas.
export function createCartOrderAdapter({ shopService }) {
  requirePort(shopService, ['getCart'], 'shopService');
  return {
    async prepare(user, cartId) {
      if (!user?.id) throw new StoreError('Autenticación requerida', 401, 'UNAUTHENTICATED');
      const cart = await shopService.getCart(cartId, { userId: user.id });
      return { items: cart.items.map(item => ({ productId: item.variantId, quantity: item.quantity })) };
    }
  };
}
