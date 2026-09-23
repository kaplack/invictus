import { StoreError } from './errors.js';
import { requirePort, parseInput } from '@base/usuarios-acceso/contracts';
import { productInput, productPatch, cartItems } from './validation.js';
const publicProduct = p => ({ ...p, variants: p.variants.map(v => ({ ...v })) });

export function createStoreService({ store, files = null, currency = 'PEN', canManage = u => ['ADMIN', 'STAFF'].includes(u.role), authorizeGuestCart } = {}) {
  requirePort(store, ['products.get', 'products.list', 'products.create', 'products.update', 'carts.get', 'carts.save'], 'store');
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('currency debe ser un código de tres letras');
  if (typeof canManage !== 'function' || (authorizeGuestCart !== undefined && typeof authorizeGuestCart !== 'function')) throw new TypeError('Autorización inválida');
  if (files) requirePort(files, ['assertOwned'], 'files');
  async function requireAdmin(user) {
    if (!user?.id || !await canManage(user)) throw new StoreError('Se requiere permiso de administración', 403, 'FORBIDDEN');
  }
  async function product(id) { const p = await store.products.get(id); if (!p) throw new StoreError('Producto no encontrado', 404, 'NOT_FOUND'); return p; }
  async function checkImage(user, id) {
    if (!id) return;
    if (!files) throw new StoreError('Configura el adaptador de archivos para usar imágenes', 409, 'FEATURE_NOT_CONFIGURED');
    await files.assertOwned(id, user.id, { visibility: 'public', image: true });
  }
  function variants(input, price, previous = []) {
    const rows = (input ?? []).map(v => {
      if (v.id && !previous.some(p => p.id === v.id)) throw new StoreError('ID de variante ajeno o desconocido', 400, 'INVALID_INPUT');
      return { ...v, id: v.id || crypto.randomUUID(), priceCents: v.priceCents ?? price };
    });
    if (new Set(rows.map(v => v.sku)).size !== rows.length || new Set(rows.map(v => v.id)).size !== rows.length) throw new StoreError('Variantes o SKU repetidos', 400, 'INVALID_INPUT');
    return rows;
  }
  async function cartAccess(cart, context = {}) {
    if (cart?.userId) {
      if (context.userId !== cart.userId) throw new StoreError('Carrito no disponible', 404, 'NOT_FOUND');
    } else if (!context.userId || cart) {
      if (!authorizeGuestCart || !await authorizeGuestCart({ cart, context })) throw new StoreError('Configura una sesión de visitante o inicia sesión', 403, 'CART_ACCESS_DENIED');
    }
  }
  return {
    async listCatalog({ categoryId } = {}) { return (await store.products.list({ categoryId })).filter(p => p.published).map(publicProduct); },
    async listAdmin(user) { await requireAdmin(user); return (await store.products.list({})).map(publicProduct); },
    async createProduct(user, input) {
      await requireAdmin(user); const parsed = parseInput(productInput, input, StoreError); await checkImage(user, parsed.imageFileId);
      return publicProduct(await store.products.create({ id: crypto.randomUUID(), ...parsed, categoryId: parsed.categoryId ?? null, imageFileId: parsed.imageFileId ?? null,
        published: parsed.published ?? false, variants: variants(parsed.variants, parsed.priceCents), createdAt: new Date().toISOString() }));
    },
    async updateProduct(user, id, input) {
      await requireAdmin(user); const patch = parseInput(productPatch, input, StoreError); const p = await product(id);
      if (patch.imageFileId) await checkImage(user, patch.imageFileId);
      const next = { ...p, ...patch, id };
      next.variants = patch.variants ? variants(patch.variants, next.priceCents, p.variants) : p.variants;
      return publicProduct(await store.products.update(id, next));
    },
    async addToCart(context = {}, items) {
      const input = parseInput(cartItems, items, StoreError);
      const existing = context.cartId ? await store.carts.get(context.cartId) : null;
      if (context.cartId && !existing) throw new StoreError('Carrito no encontrado', 404, 'NOT_FOUND');
      await cartAccess(existing, context);
      const checked = []; const seen = new Set();
      for (const item of input) {
        if (seen.has(item.variantId)) throw new StoreError('Variante repetida', 400, 'INVALID_INPUT');
        seen.add(item.variantId);
        const p = await product(item.productId); if (!p.published) throw new StoreError('Producto no disponible', 404, 'NOT_FOUND');
        const variant = p.variants.find(v => v.id === item.variantId);
        if (!variant) throw new StoreError('Variante no encontrada', 404, 'NOT_FOUND');
        if (item.quantity > variant.stock) throw new StoreError('Cantidad mayor al stock disponible', 409, 'STOCK_EXCEEDED');
        const lineTotalCents = variant.priceCents * item.quantity;
        if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents < 0 || lineTotalCents > 2000000000) throw new StoreError('Importe fuera de rango', 400, 'INVALID_TOTAL');
        checked.push({ ...item, name: p.name + ' — ' + variant.name, unitPriceCents: variant.priceCents, lineTotalCents });
      }
      const totalCents = checked.reduce((sum, i) => sum + i.lineTotalCents, 0);
      if (totalCents > 2000000000) throw new StoreError('Importe fuera de rango', 400, 'INVALID_TOTAL');
      return store.carts.save(context.cartId || crypto.randomUUID(), { userId: existing?.userId ?? context.userId ?? null, items: checked, totalCents, currency });
    },
    async getCart(cartId, context = {}) { const cart = await store.carts.get(cartId); if (!cart) throw new StoreError('Carrito no encontrado', 404, 'NOT_FOUND'); await cartAccess(cart, context); return cart; },
    async checkoutSummary(cartId, context = {}) { const cart = await this.getCart(cartId, context); const refreshed = await this.addToCart({ ...context, cartId }, cart.items); return { ...refreshed, orderPayload: { items: refreshed.items, totalCents: refreshed.totalCents, currency: refreshed.currency } }; },
    requireAdmin
  };
}

