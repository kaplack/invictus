import { z } from 'zod';
const id = z.string().min(1).max(100);
export const profileInput = z.object({ publicName: z.string().trim().min(1).max(120), bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(), disciplines: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  experience: z.string().trim().max(3000).optional(), achievements: z.string().trim().max(3000).optional(),
  avatarFileId: id.nullable().optional(), documentFileIds: z.array(id).max(20).optional(),
  publicLink: z.string().url().refine(v => ['http:', 'https:'].includes(new URL(v).protocol)).nullable().optional(), visibility: z.enum(['PUBLIC', 'PRIVATE']).optional() });
