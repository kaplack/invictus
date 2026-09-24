import {AppError} from '@base/usuarios-acceso';
import {administrator} from './permissions.js';
import {z} from 'zod';
export function createPersonalEvents({db,commerce,eventsFor,registrationsFor}) {
  const owner = actor => ({...actor,role:'ORGANIZER'});
  const lock = (database,id) => database.$queryRaw`SELECT id FROM events WHERE id = ${id}::uuid FOR UPDATE`;
  const editable = event => {
    if(event.source!=='EXTERNAL'||event.status!=='DRAFT'||!['DRAFT','CHANGES_REQUESTED'].includes(event.reviewStatus))
      throw new AppError('Solo puedes editar borradores o eventos devueltos con observaciones',409,'REVIEW_LOCKED');
  };
  return {
    list: actor => db.event.findMany({where:{organizerId:actor.id,source:'EXTERNAL'},orderBy:{createdAt:'desc'}}),
    async get(actor,id) {
      const event=await eventsFor(db).getManaged(owner(actor),id);
      if(event.source!=='EXTERNAL')throw new AppError('Evento no encontrado',404,'NOT_FOUND');
      return {...event,configuration:await db.eventRegistrationConfig.findUnique({where:{eventId:id}})};
    },
    async attendees(actor,id) {
      const event=await eventsFor(db).getManaged(owner(actor),id);
      if(event.source!=='EXTERNAL')throw new AppError('Evento no encontrado',404,'NOT_FOUND');
      const rows=await registrationsFor(db).service.listManaged(owner(actor),id);
      const users=await db.user.findMany({where:{id:{in:rows.map(r=>r.userId)}},select:{id:true,name:true,lastName:true,email:true}});
      return rows.map(r=>({id:r.id,status:r.status,participant:users.find(u=>u.id===r.userId)}));
    },
    async save(actor,id,input) {
      const {maxCapacity,...data}=input;
      if(!z.number().int().min(1).max(1000000).safeParse(maxCapacity).success)throw new AppError('Indica un cupo entre 1 y 1000000',400,'INVALID_CAPACITY');
      if('status' in data)throw new AppError('El estado lo determina la revisión de Invictus',403,'FORBIDDEN');
      return commerce.run(null,async tx=>{
        const database=tx.database,svc=eventsFor(database),user=owner(actor);
        if(id){await lock(database,id);editable(await svc.getManaged(user,id));}
        const event=id?await svc.update(user,id,data):await svc.create(user,data);
        await registrationsFor(database).service.configure(user,event.id,{amountCents:0,currency:'PEN',maxCapacity,paymentRecipientId:null});
        return database.event.update({where:{id:event.id},data:{source:'EXTERNAL'}});
      });
    },
    async submit(actor,id) {
      return commerce.run(null,async tx=>{
        const database=tx.database;await lock(database,id);
        const event=await eventsFor(database).getManaged(owner(actor),id);editable(event);
        if(new Date(event.startsAt)<=new Date())throw new AppError('El evento debe tener una fecha futura',400,'INVALID_DATE');
        if(!await database.eventRegistrationConfig.findUnique({where:{eventId:id}}))throw new AppError('Configura el cupo primero',409,'NOT_CONFIGURED');
        return database.event.update({where:{id},data:{reviewStatus:'PENDING_REVIEW',reviewNote:null}});
      });
    },
    async review(actor,id,input) {
      administrator(actor);
      const parsed=z.object({decision:z.enum(['APPROVE','REQUEST_CHANGES']),note:z.string().trim().max(2000).optional()}).strict().parse(input);
      if(parsed.decision==='REQUEST_CHANGES'&&!parsed.note)throw new AppError('Explica qué debe corregir el organizador',400,'NOTE_REQUIRED');
      return commerce.run(null,async tx=>{
        const database=tx.database;await lock(database,id);
        const event=await database.event.findUnique({where:{id}});
        if(!event)throw new AppError('Evento no encontrado',404,'NOT_FOUND');
        if(event.source!=='EXTERNAL'||event.status!=='DRAFT'||event.reviewStatus!=='PENDING_REVIEW')throw new AppError('El evento no está pendiente de revisión',409,'INVALID_STATE');
        const approved=parsed.decision==='APPROVE';
        if(approved&&new Date(event.startsAt)<=new Date())throw new AppError('La fecha del evento ya pasó; solicita una corrección',409,'INVALID_DATE');
        return database.event.update({where:{id},data:{status:approved?'PUBLISHED':'DRAFT',reviewStatus:approved?'APPROVED':'CHANGES_REQUESTED',reviewNote:approved?null:parsed.note}});
      });
    }
  };
}
