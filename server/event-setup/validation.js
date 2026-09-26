import { z } from 'zod';

export const idInput = z.string().uuid();
const text = max => z.string().trim().max(max).nullable().optional().transform(v => v || null);
const currency = z.enum(['PEN', 'USD']).default('PEN');
export const categoryInput = z.object({
  name: z.string().trim().min(1).max(160), description: text(2000),
  gender: z.enum(['FEMALE', 'MALE']).nullable().default(null),
  minAge: z.number().int().min(0).max(120).nullable().default(null),
  maxAge: z.number().int().min(0).max(120).nullable().default(null),
  modality: text(100), priceCents: z.number().int().min(0).max(2000000000), currency,
  capacity: z.number().int().min(1).max(1000000).nullable().default(null), active: z.boolean().default(true),
}).strict().refine(v => v.minAge === null || v.maxAge === null || v.minAge <= v.maxAge, { message: 'La edad mínima no puede superar la máxima', path: ['maxAge'] });

export const paymentMethodInput = z.object({
  type: z.enum(['YAPE', 'PLIN', 'BANK_TRANSFER', 'CASH']),
  label: z.string().trim().min(1).max(120), phone: text(40), holderName: text(120), bank: text(120),
  accountNumber: text(40), cci: text(20), currency, instructions: text(2000),
  qrFileId: idInput.nullable().default(null), active: z.boolean().default(true),
}).strict().superRefine((v, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (['YAPE', 'PLIN'].includes(v.type)) {
    if (!/^9\d{8}$/.test(v.phone || '')) issue('phone', 'Indica un teléfono de 9 dígitos que comience por 9');
    if (!v.holderName) issue('holderName', 'Indica el titular');
    if (v.currency !== 'PEN') issue('currency', 'Yape y Plin se configuran en soles');
  }
  if (v.type === 'BANK_TRANSFER') {
    for (const key of ['bank', 'holderName', 'accountNumber']) if (!v[key]) issue(key, 'Completa los datos bancarios');
    if (v.cci && !/^\d{20}$/.test(v.cci)) issue('cci', 'El CCI debe tener 20 dígitos');
  }
  if (v.type === 'CASH' && !v.instructions) issue('instructions', 'Indica dónde o cómo pagar en efectivo');
  if (v.qrFileId && !['YAPE', 'PLIN'].includes(v.type)) issue('qrFileId', 'El QR se configura para Yape o Plin');
}).transform(v => ({ ...v,
  phone: ['YAPE', 'PLIN'].includes(v.type) ? v.phone : null,
  holderName: v.type === 'CASH' ? null : v.holderName,
  bank: v.type === 'BANK_TRANSFER' ? v.bank : null,
  accountNumber: v.type === 'BANK_TRANSFER' ? v.accountNumber : null,
  cci: v.type === 'BANK_TRANSFER' ? v.cci : null,
}));

export const methodSelectionInput = z.object({ methodIds: z.array(idInput).max(100).refine(ids => new Set(ids).size === ids.length, 'No repitas métodos') }).strict();
