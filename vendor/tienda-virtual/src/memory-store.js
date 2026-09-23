export function createMemoryStore(seed = {}) {
  const products = new Map((seed.products ?? []).map(p => [p.id, structuredClone(p)])); const carts = new Map();
  return { products: { async get(id) { return structuredClone(products.get(id) ?? null); }, async list({ categoryId } = {}) { return [...products.values()].filter(p => !categoryId || p.categoryId === categoryId).map(p => structuredClone(p)); }, async create(p) { products.set(p.id, structuredClone(p)); return structuredClone(p); }, async update(id, p) { products.set(id, structuredClone(p)); return structuredClone(p); } }, carts: { async get(id) { return structuredClone(carts.get(id) ?? null); }, async save(id, c) { carts.set(id, structuredClone({ ...c, cartId: id })); return structuredClone(carts.get(id)); } } };
}
