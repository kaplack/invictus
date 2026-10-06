import { z } from 'zod';
import { profileInput } from '../../vendor/perfil-trayectoria/src/validation.js';
import { usernameSchema } from '@base/usuarios-acceso';
import { countryCodes } from './location.js';
const text = max => z.string().trim().max(max).nullable().optional().transform(v => v === '' ? null : v);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === value
    && value <= new Date().toISOString().slice(0,10);
}, 'Ingresa una fecha de nacimiento válida');
const sportsInput = z.array(z.object({disciplineId:z.string().uuid(),isPrimary:z.boolean().default(false)}).strict()).max(20)
 .refine(rows=>new Set(rows.map(row=>row.disciplineId)).size===rows.length,'No repitas deportes')
 .refine(rows=>rows.filter(row=>row.isPrimary).length<=1,'Elige como máximo un deporte principal');
export const athleteProfileInput = profileInput.partial().extend({
  disciplines: sportsInput.optional(),
  websiteUrl: z.string().max(2048).nullable().optional(),
  socialLinks: z.array(z.object({platform:z.enum(['INSTAGRAM','TIKTOK','FACEBOOK','YOUTUBE','LINKEDIN']),url:z.string().max(2048)})).max(5).optional(),
  username: usernameSchema.optional(),
  name: text(80), lastName: text(120),
  dateOfBirth: z.union([date,z.literal('')]).nullable().optional().transform(v => v === '' ? null : v),
  gender: z.enum(['MALE','FEMALE','NON_BINARY','SELF_DESCRIBED','PREFER_NOT_TO_SAY']).nullable().optional(),
  documentType: z.enum(['DNI','FOREIGN_RESIDENT_CARD','PASSPORT']).nullable().optional(),
  documentNumber: text(30),
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/, 'Incluye el código internacional').nullable().optional(),
  countryCode: z.string().trim().toUpperCase().refine(v => countryCodes.has(v)).nullable().optional(),
  department: text(120), province: text(120), district: text(120),
  ubigeoCode: z.string().regex(/^\d{6}$/).nullable().optional(),
  bannerFileId: z.string().uuid().nullable().optional()
});
