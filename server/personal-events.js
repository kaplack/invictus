import {personalLifecycle} from './event-setup/lifecycle.js';
import {profileNamesSelect,identityView} from './profile/identity.js';
import {AppError} from '@base/usuarios-acceso';
import {administrator} from './permissions.js';
import {z} from 'zod';
import {saveEventDiscipline,assertEventSetupReady,assertEventLogisticsReady} from './event-setup/service.js';
import {managedEventWhere,teamSummary,requireTeamManager,lockManagedEvent,assertSameTeam} from './teams/event-access.js';
export function createPersonalEvents({db,commerce,eventsFor,registrationsFor}) {
  const lock = (database,id) => database.$queryRaw`SELECT id FROM events WHERE id = ${id}::uuid FOR UPDATE`;
  const editable = event => {
    if(!event.teamId && ['DRAFT','PUBLISHED'].includes(event.status)) return;
    if(event.status!=='DRAFT'||!['DRAFT','CHANGES_REQUESTED'].includes(event.reviewStatus))
      throw new AppError('Solo puedes editar borradores o eventos devueltos con observaciones',409,'REVIEW_LOCKED');
  };
  return {
    async list(actor) {const rows=await db.event.findMany({where:{AND:[managedEventWhere(actor),{mode:'MANAGED'}]},include:{team:{select:teamSummary},_count:{select:{registrationEventRows:true}}},orderBy:{createdAt:'desc'}});return rows.map(event=>({...event,...(!event.teamId?{lifecycle:personalLifecycle(event,event._count.registrationEventRows)}:{})}));},
    async get(actor,id) {
      const event=await eventsFor(db).getManaged(actor,id);
      return {...event,...(!event.teamId?{lifecycle:personalLifecycle(event,await db.eventRegistration.count({where:{eventId:id}}))}:{}),team:event.teamId?await db.team.findUnique({where:{id:event.teamId},select:teamSummary}):null,configuration:await db.eventRegistrationConfig.findUnique({where:{eventId:id}})};
    },
    async attendees(actor,id) {
      await eventsFor(db).getManaged(actor,id);
      const rows=await registrationsFor(db).service.listManaged(actor,id);
      const users=await db.user.findMany({where:{id:{in:rows.map(r=>r.userId).filter(Boolean)}},select:{id:true,username:true,name:true,lastName:true,email:true,...profileNamesSelect}});
      return rows.map(r=>({id:r.id,status:r.status,participant:r.participantSnapshot || identityView(users.find(u=>u.id===r.userId))}));
    },
    async save(actor,id,input) {
      let {maxCapacity,teamId,disciplineId,...data}=input;
      if(!id && maxCapacity===undefined)maxCapacity=50;
      if(maxCapacity!==undefined&&!z.number().int().min(1).max(1000000).safeParse(maxCapacity).success)throw new AppError('Indica un cupo entre 1 y 1000000',400,'INVALID_CAPACITY');
      if('status' in data)throw new AppError('Usa las acciones de publicación para cambiar el estado',403,'FORBIDDEN');
      return commerce.run(null,async tx=>{
        const database=tx.database;
        if(id){const current=await lockManagedEvent(database,actor,id);if(current.mode==='INFORMATIONAL')throw new AppError('Gestiona el evento informativo desde administración',409,'INFORMATIONAL_EVENT');assertSameTeam(current,teamId);editable(current);
          if(current.status==='PUBLISHED' && ((data.description!==undefined&&!data.description?.trim()) || (data.startsAt!==undefined&&!data.startsAt)))throw new AppError('Un evento publicado necesita descripción y fecha',400,'INCOMPLETE_EVENT');
          const registrationCount=await database.eventRegistration.count({where:{eventId:id}});
          if(maxCapacity===undefined)maxCapacity=(await database.eventRegistrationConfig.findUnique({where:{eventId:id}}))?.maxCapacity||50;
          const lifecycle=personalLifecycle(current,registrationCount);
          if(!current.teamId && lifecycle.conditionsLocked) {
            if(data.title!==undefined&&data.title!==current.title)throw new AppError('Con inscripciones o después del inicio, conserva el nombre; puedes editar descripción, imagen y ubicación',409,'CONFIG_IN_USE');
            const configuration=await database.eventRegistrationConfig.findUnique({where:{eventId:id}});
            if((data.startsAt!==undefined && new Date(data.startsAt).getTime()!==current.startsAt?.getTime()) ||
              (data.timeZone!==undefined && data.timeZone!==current.timeZone) ||
              (disciplineId!==undefined && disciplineId!==current.disciplineId) || maxCapacity!==configuration?.maxCapacity)
              throw new AppError('Con inscripciones o después del inicio, conserva fecha, disciplina y cupo; puedes editar descripción, imagen y ubicación',409,'CONFIG_IN_USE');
          }
        }
        else if(teamId) await requireTeamManager(database,actor,teamId,true);
        else {
          const profile=await database.participantProfile.findUnique({where:{userId:actor.id}});
          if(!profile?.name?.trim() || !profile?.lastName?.trim() || profile.documentType!=='DNI' || !/^\d{8}$/.test(profile.documentNumber || '') || !profile.phone?.trim())
            throw new AppError('Completa nombres, apellidos, DNI y teléfono en tu perfil antes de crear un evento',409,'PROFILE_INCOMPLETE');
        }
        const svc=eventsFor(database,{teamId,createdByUserId:actor.id,source:'EXTERNAL',allowIncompleteDraft:!teamId});
        const event=id?await svc.update(actor,id,data):await svc.create(actor,data);
        if(event.status==='PUBLISHED')assertEventLogisticsReady(event);
        await saveEventDiscipline(database,event,disciplineId);
        const configuration=await database.eventRegistrationConfig.findUnique({where:{eventId:event.id}});
        if(!configuration)await registrationsFor(database).service.configure(actor,event.id,{amountCents:0,currency:'PEN',maxCapacity,paymentRecipientId:null});
        else if(configuration.maxCapacity!==maxCapacity){
          if(await database.eventRegistration.count({where:{eventId:event.id}}))throw new AppError('El cupo queda fijo tras recibir inscripciones',409,'CONFIG_IN_USE');
          await database.eventRegistrationConfig.update({where:{eventId:event.id},data:{maxCapacity}});
        }
        return {...event,...(disciplineId!==undefined?{disciplineId}:{})};
      });
    },
    async publication(actor,id,publish) {
      return commerce.run(null,async tx=>{
        const database=tx.database;
        const event=await lockManagedEvent(database,actor,id);
        if(event.mode==='INFORMATIONAL')throw new AppError('Gestiona el evento informativo desde administración',409,'INFORMATIONAL_EVENT');
        if(event.teamId)throw new AppError('Los eventos de Teams conservan su revisión actual',409,'REVIEW_REQUIRED');
        if(!['DRAFT','PUBLISHED'].includes(event.status))throw new AppError('El evento está cerrado',409,'IMMUTABLE_STATE');
        const lifecycle=personalLifecycle(event,await database.eventRegistration.count({where:{eventId:id}}));
        if(lifecycle.publicationBlockReason)throw new AppError(lifecycle.publicationBlockReason,409,'PUBLICATION_LOCKED');
        if(publish){
          if(!event.description?.trim())throw new AppError('Completa la descripción antes de publicar',400,'INVALID_DESCRIPTION');
          if(!event.startsAt || event.startsAt<=new Date())throw new AppError('El evento debe tener una fecha futura',400,'INVALID_DATE');
          if(!event.venue?.trim())throw new AppError('Indica la ubicación antes de publicar',400,'INVALID_LOCATION');
          if(!await database.eventRegistrationConfig.findUnique({where:{eventId:id}}))throw new AppError('Configura el cupo primero',409,'NOT_CONFIGURED');
          await assertEventSetupReady(database,event);
        }
        return database.event.update({where:{id},data:{status:publish?'PUBLISHED':'DRAFT',reviewStatus:publish?'APPROVED':'DRAFT',reviewNote:null}});
      });
    },
    async submit(actor,id) {
      return commerce.run(null,async tx=>{
        const database=tx.database;
        const event=await lockManagedEvent(database,actor,id);editable(event);
        if(!event.teamId)throw new AppError('Usa Publicar para tu evento personal',409,'DIRECT_PUBLICATION');
        if(event.source!=='EXTERNAL')throw new AppError('Los eventos Invictus se publican desde Gestión',409,'INVICTUS_PUBLICATION');
        if(new Date(event.startsAt)<=new Date())throw new AppError('El evento debe tener una fecha futura',400,'INVALID_DATE');
        if(!await database.eventRegistrationConfig.findUnique({where:{eventId:id}}))throw new AppError('Configura el cupo primero',409,'NOT_CONFIGURED');
        await assertEventSetupReady(database,event);
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
        if(approved)await assertEventSetupReady(database,event);
        if(approved&&new Date(event.startsAt)<=new Date())throw new AppError('La fecha del evento ya pasó; solicita una corrección',409,'INVALID_DATE');
        return database.event.update({where:{id},data:{status:approved?'PUBLISHED':'DRAFT',reviewStatus:approved?'APPROVED':'CHANGES_REQUESTED',reviewNote:approved?null:parsed.note}});
      });
    }
  };
}
