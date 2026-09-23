import { z } from 'zod';
const envSchema = z.object({
 NODE_ENV:z.enum(['development','test','production']).default('development'),
 DATABASE_URL:z.string().url(), PORT:z.coerce.number().int().min(1).max(65535).default(3100),
 WEB_ORIGINS:z.string().default('http://localhost:5173,http://localhost:5175'), PUBLIC_WEB_URL:z.string().url().default('http://localhost:5173'),
 STORAGE_DRIVER:z.enum(['local','s3']).default('local'), UPLOAD_DIRECTORY:z.string().default('./uploads'),
 FILE_SIGNING_KEY:z.string().min(32), PAYMENT_RECIPIENT_ID:z.string().uuid().default('00000000-0000-4000-8000-000000000001'),
 PAYMENT_METHODS:z.string().default('cash'), TRUST_PROXY:z.coerce.number().int().min(0).max(2).default(0),
 S3_BUCKET:z.string().optional(), AWS_REGION:z.string().optional()
});
export function readConfig(env=process.env) {
 const parsed=envSchema.safeParse(env);
 if(!parsed.success) throw new Error('Configuración inválida: '+parsed.error.issues.map(i=>i.path.join('.')).join(', '));
 const c=parsed.data; c.origins=c.WEB_ORIGINS.split(',').map(s=>s.trim());
 for(const origin of c.origins) { const u=new URL(origin); if(u.origin!==origin) throw new Error('WEB_ORIGINS requiere orígenes sin rutas'); }
 c.methods=c.PAYMENT_METHODS.split(','); if(c.methods.some(m=>!['cash','yape','plin'].includes(m))) throw new Error('PAYMENT_METHODS inválido');
 if(c.STORAGE_DRIVER==='s3'&&(!c.S3_BUCKET||!c.AWS_REGION)) throw new Error('Falta configuración S3');
 if(c.NODE_ENV==='production'&&(c.STORAGE_DRIVER!=='s3'||!c.PUBLIC_WEB_URL.startsWith('https://')||c.origins.some(o=>!o.startsWith('https://')))) throw new Error('Producción requiere S3 y HTTPS');
 return c;
}
