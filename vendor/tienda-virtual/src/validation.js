import { z } from 'zod';
const id = z.string().min(1).max(100);
const cents = z.number().int().min(0).max(2000000000);
const variant = z.object({ id: id.optional(), name: z.string().trim().min(1).max(160), sku: z.string().trim().min(1).max(80), priceCents: cents.optional(), stock: z.number().int().min(0).max(2147483647) }).strict();
export const productInput = z.object({ name: z.string().trim().min(1).max(180), description: z.string().trim().min(1).max(10000), categoryId: id.nullable().optional(), imageFileId: id.nullable().optional(), priceCents: cents, published: z.boolean().optional(), variants: z.array(variant).max(100).optional() }).strict();
export const productPatch = productInput.partial();
export const cartItems = z.array(z.object({ productId: id, variantId: id, quantity: z.number().int().min(1).max(99) })).min(1).max(30);
