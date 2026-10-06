import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '@base/usuarios-acceso';
import { parseInput, runCoordinated } from '@base/usuarios-acceso/contracts';
import { createAthleteProfileService } from './service.js';
import { normalizeLink } from './digital.js';
const text=max=>z.string().trim().max(max).nullable().optional().transform(value=>value || null);
const entryInput=z.object({
 eventName:z.string().trim().min(1).max(160),disciplineId:z.string().uuid(),year:z.number().int().min(1900).max(9999),
 eventDate:text(10),location:text(160),eventTest:text(120),category:text(120),result:text(120),
 position:z.number().int().positive().max(1000000).nullable().optional(),organizer:text(160),description:text(2000),officialUrl:text(2048)
}).strict();
const select={id:true,eventName:true,year:true,eventDate:true,location:true,eventTest:true,category:true,result:true,position:true,organizer:true,description:true,officialUrl:true,
 discipline:{select:{id:true,code:true,name:true,active:true}}};
const view=row=>({...row,eventDate:row.eventDate?row.eventDate.toISOString().slice(0,10):null,source:'EXTERNAL',verification:'DECLARED'});
const missing=()=>{throw new AppError('Participación no encontrada.',404,'NOT_FOUND');};
export function createTrajectoryService({database:db,files}) {
 return {
  async list(actor) {
   const rows=await db.externalParticipation.findMany({where:{profile:{userId:actor.id}},select,orderBy:[{year:'desc'},{eventDate:{sort:'desc',nulls:'last'}},{createdAt:'desc'},{id:'desc'}]});
   return rows.map(view);
  },
  async save(actor,id,raw) {
   const input=parseInput(entryInput,raw);
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
   const today=parts.year+'-'+parts.month+'-'+parts.day;
   const currentYear=Number(new Intl.DateTimeFormat('en',{timeZone:'America/Lima',year:'numeric'}).format(new Date()));
   if(input.year>currentYear)throw new AppError('La trayectoria registra participaciones pasadas; revisa el año.',400,'INVALID_YEAR');
   if(input.eventDate){
    const parsed=new Date(input.eventDate+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==input.eventDate||parsed.getUTCFullYear()!==input.year||input.eventDate>today)
     throw new AppError('La fecha debe ser válida, pasada y corresponder al año indicado.',400,'INVALID_DATE');
   }
   if(input.officialUrl){try{input.officialUrl=normalizeLink(input.officialUrl);}catch{throw new AppError('Enlace oficial: ingresa una URL HTTP o HTTPS válida.',400,'INVALID_LINK');}}
   return runCoordinated(db,async tx=>{
    const current=id?await tx.externalParticipation.findFirst({where:{id:parseInput(z.string().uuid(),id),profile:{userId:actor.id}}}):null;
    if(id&&!current)missing();
    const discipline=await tx.discipline.findUnique({where:{id:input.disciplineId}});
    if(!discipline || (!discipline.active && current?.disciplineId!==discipline.id))throw new AppError('Selecciona una disciplina activa del catálogo.',400,'INVALID_DISCIPLINE');
    const profile=await tx.participantProfile.findUnique({where:{userId:actor.id}}) || await createAthleteProfileService({database:tx,files}).save(actor,{});
    const data={...input,position:input.position??null,eventDate:input.eventDate?new Date(input.eventDate+'T00:00:00Z'):null};
    const row=id?await tx.externalParticipation.update({where:{id},data,select}):await tx.externalParticipation.create({data:{...data,participantProfileId:profile.id},select});
    return view(row);
   });
  },
  async remove(actor,id) {
   parseInput(z.string().uuid(),id);
   return runCoordinated(db,async tx=>{const found=await tx.externalParticipation.findFirst({where:{id,profile:{userId:actor.id}},select:{id:true}});if(!found)missing();await tx.externalParticipation.delete({where:{id}});});
  }
 };
}
export function createTrajectoryRouter({service,requireAuth}) {
 const router=Router();router.use(requireAuth);
 router.get('/',async(req,res)=>res.json(await service.list(req.user)));
 router.post('/',async(req,res)=>res.status(201).json(await service.save(req.user,null,req.body)));
 router.put('/:id',async(req,res)=>res.json(await service.save(req.user,req.params.id,req.body)));
 router.delete('/:id',async(req,res)=>{await service.remove(req.user,req.params.id);res.status(204).end();});
 return router;
}
