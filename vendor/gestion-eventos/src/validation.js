import { z } from 'zod';
const id = z.string().min(1).max(100);
const optionalText = max => z.string().trim().max(max).nullable().optional();
const httpUrl = z.string().url().refine(v => ['http:', 'https:'].includes(new URL(v).protocol));
const timeZone = z.string().min(1).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } });
export const eventInput = z.object({ title: z.string().trim().min(1).max(180), description: z.string().trim().min(1).max(10000),
  type: optionalText(100), startsAt: z.string().datetime({ offset: true }), timeZone, venue: optionalText(500), virtualUrl: httpUrl.nullable().optional(),
  primaryImageFileId: id.nullable().optional(), bannerImageFileId: id.nullable().optional(), galleryFileIds: z.array(id).max(50).optional(),
  benefits: z.array(z.object({ id: id.optional(), kind: z.string().max(80).optional(), name: z.string().trim().min(1).max(180), description: optionalText(2000),
    imageFileId: id.nullable().optional(), condition: optionalText(1000) }).strict()).max(100).optional() }).strict();
export const eventPatch = eventInput.partial().extend({ status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'FINISHED', 'CANCELLED']).optional() });
