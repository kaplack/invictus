import { z } from 'zod';
import { AppError } from '@base/usuarios-acceso';
import { administrator } from './permissions.js';
const input=z.object({contactName:z.string().trim().min(2).max(120),email:z.string().email().max(254),phone:z.string().trim().min(6).max(40),quantity:z.number().int().min(1).max(100000),requiredDate:z.iso.date(),design:z.string().trim().min(10).max(5000)}).strict();
export function createQuoteService(db){return {
 async create(actor,body){const p=input.safeParse(body);if(!p.success)throw new AppError('Revisa contacto, cantidad, fecha y descripción',400,'INVALID_INPUT');if(p.data.requiredDate<new Date().toISOString().slice(0,10))throw new AppError('La fecha requerida debe ser futura',400,'INVALID_DATE');const q=await db.quoteRequest.create({data:{...p.data,requiredDate:new Date(p.data.requiredDate+'T12:00:00Z'),userId:actor?.id??null}});return {id:q.id,status:q.status};},
 list(actor){administrator(actor);return db.quoteRequest.findMany({orderBy:{createdAt:'desc'},take:100});}
};}
