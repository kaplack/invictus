import {AppError} from '@base/usuarios-acceso';
import {administrator} from './permissions.js';
import {z} from 'zod';
import {managedEventWhere,teamSummary,requireTeamManager,lockManagedEvent,assertSameTeam} from './teams/event-access.js';
export function createPersonalEvents({db,commerce,eventsFor,registrationsFor}) {
  const lock = (database,id) => database.$queryRaw`SELECT id FROM events WHERE id = ${id}::uuid FOR UPDATE`;
  const editable = event => {
    if(event.status!=='DRAFT'||!['DRAFT','CHANGES_REQUESTED'].includes(event.reviewStatus))
      throw new AppError('Solo puedes editar borradores o eventos devueltos con observaciones',409,'REVIEW_LOCKED');
  };
  return {
    list: actor => db.event.findMany({where:managedEventWhere(actor),include:{team:{select:teamSummary}},orderBy:{createdAt:'desc'}}),
    async get(actor,id) {
      const event=await eventsFor(db).getManaged(actor,id);
      return {...event,team:event.teamId?await db.team.findUnique({where:{id:event.teamId},select:teamSummary}):null,configuration:await db.eventRegistrationConfig.findUnique({where:{eventId:id}})};
    },
    async attendees(actor,id) {
      await eventsFor(db).getManaged(actor,id);
      const rows=await registrationsFor(db).service.listManaged(actor,id);
      const users=await db.user.findMany({where:{id:{in:rows.map(r=>r.userId)}},select:{id:true,name:true,lastName:true,email:true}});
      return rows.map(r=>({id:r.id,status:r.status,participant:users.find(u=>u.id===r.userId)}));
    },
    async save(actor,id,input) {
      const {maxCapacity,teamId,...data}=input;
      if(!z.number().int().min(1).max(1000000).safeParse(maxCapacity).success)throw new AppError('Indica un cupo entre 1 y 1000000',400,'INVALID_CAPACITY');
      if('status' in data)throw new AppError('El estado lo determina la revisión de Invictus',403,'FORBIDDEN');
      return commerce.run(null,async tx=>{
        const database=tx.database;
        if(id){const current=await lockManagedEvent(database,actor,id);assertSameTeam(current,teamId);editable(current);}
        else await requireTeamManager(database,actor,teamId,true);
        const svc=eventsFor(database,{teamId,createdByUserId:actor.id,source:'EXTERNAL'});
        const event=id?await svc.update(actor,id,data):await svc.create(actor,data);
        await registrationsFor(database).service.configure(actor,event.id,{amountCents:0,currency:'PEN',maxCapacity,paymentRecipientId:null});
        return event;
      });
    },
    async submit(actor,id) {
      return commerce.run(null,async tx=>{
        const database=tx.database;
        const event=await lockManagedEvent(database,actor,id);editable(event);
        if(event.source!=='EXTERNAL')throw new AppError('Los eventos Invictus se publican desde Gestión',409,'INVICTUS_PUBLICATION');
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
