import {isDeepStrictEqual} from 'node:util';
import {profileNamesSelect,identityView} from './profile/identity.js';
import {createGuestRegistrations} from './registrations/guest.js';
import { createAthleteProfileService } from './profile/service.js';
import {createPersonalEvents} from './personal-events.js';
import {saveEventDiscipline,assertEventSetupReady,assertEventLogisticsReady,setupEditable} from './event-setup/service.js';
import {prepareRegistration,onRegistrationResult,categoryPaymentPolicy} from './registrations/policy.js';
import {createCategoryRegistrations} from './registrations/service.js';
import { createEventService, createPrismaEventStore } from '@base/gestion-eventos';
import { createPrismaRegistrationCoordinator } from '@base/inscripciones-eventos';
import { createPrismaCommerceStore } from '@base/pedidos-pagos';
import { createOrderService } from '@base/pedidos';
import { createPaymentService, openPaymentOperation, createRecipientService } from '@base/pagos-manuales';
import { createStoreService, createPrismaStore, createPrismaCheckout } from '@base/tienda-virtual';
import { AppError } from '@base/usuarios-acceso';
import { z } from 'zod';
import { isAdmin, organizer, resolvePermissions, administrator } from './permissions.js';
import { requireTeamManager, requireEventManager, lockManagedEvent, assertSameTeam, teamSummary } from './teams/event-access.js';
const capacity=z.number().int().min(1).max(1000000);
export function composeServices({database:db,Prisma,files,config}) {
 const commerce=createPrismaCommerceStore(db);
 const registrationsFor=database=>createPrismaRegistrationCoordinator({database,Prisma,commerceStore:createPrismaCommerceStore(database),openPaymentOperation,publicBaseUrl:config.PUBLIC_WEB_URL,resolvePermissions,policy:'reserve-until-terminal',authorizeManage:requireEventManager,autoConfirmFree:true,prepareRegistration,onRegistrationResult});
 const eventsFor=(database,ownership)=>{
  const store=createPrismaEventStore(database),create=store.events.create,update=store.events.update;
  store.events.update=async(id,event)=>{
   const previous=await database.event.findUnique({where:{id}});
   if(!isDeepStrictEqual(previous.competitionConfig,event.competitionConfig)&&(!setupEditable(previous)||await database.eventRegistration.count({where:{eventId:id}})))throw new AppError('Las divisiones solo se cambian en un borrador sin inscripciones',409,'CONFIG_IN_USE');
   return update(id,event);
  };
  store.events.create=async event=>{
   if(!ownership?.createdByUserId)throw new AppError('Creador requerido',400,'CREATOR_REQUIRED');
   const saved=await create(event);
   const metadata={teamId:ownership.teamId || null,createdByUserId:ownership.createdByUserId,source:ownership.source};
   await database.event.update({where:{id:saved.id},data:metadata});
   return {...saved,...metadata};
  };
  return createEventService({allowIncompleteDraft:ownership?.allowIncompleteDraft===true,store,fileService:files,publicBaseUrl:config.PUBLIC_WEB_URL,authorizeManage:(actor,event)=>requireEventManager(database,actor,event)});
 };
 const registrations=registrationsFor(db);
 const profiles=createAthleteProfileService({database:db,files,registrations:registrations.service,canModerate:isAdmin});
 const checkout=createPrismaCheckout({database:db,commerceStore:commerce,createOrderService,openPaymentOperation,recipientId:config.PAYMENT_RECIPIENT_ID,resolvePermissions,policy:'reserve-until-terminal'});
 const paymentsFor=database=>createPaymentService({store:createPrismaCommerceStore(database),fileService:files,resolvePermissions,methods:config.methods,onResult:registrationsFor(database).onResult,operationPolicy:categoryPaymentPolicy});
 const payments=paymentsFor(db);
 const categoryRegistrations=createCategoryRegistrations({database:db,commerce,registrationsFor,paymentsFor,files});
 const guestRegistrations=createGuestRegistrations({database:db,commerce,categoryRegistrations,paymentsFor,files,config});
 const shop=createStoreService({store:createPrismaStore(db),files,canManage:isAdmin});
 const publicCount={registrationEventRows:{where:{status:'CONFIRMED'}}};
 const withParticipantCount=({ _count,...event })=>({...event,_count:{categories:_count.categories},participantCount:_count.registrationEventRows});
 const events={
  async publicList(upcoming=false){const rows=await db.event.findMany({where:{status:'PUBLISHED',...(upcoming?{startsAt:{gt:new Date()}}:{})},select:{id:true,title:true,description:true,publicSlug:true,startsAt:true,timeZone:true,venue:true,primaryImageFileId:true,mode:true,publicOrganizerName:true,externalUrl:true,discipline:{select:{name:true}},categories:{where:{active:true},select:{priceCents:true,currency:true}},registrationConfigEventRows:{select:{amountCents:true,currency:true}},team:{select:teamSummary},_count:{select:{categories:true,...publicCount}}},orderBy:{startsAt:'asc'},take:100});return rows.map(withParticipantCount);},
  async detail(slug){const e=await eventsFor(db).getPublic(slug);const setup=await db.event.findUnique({where:{id:e.id},select:{discipline:{select:{name:true}},categories:{where:{active:true},orderBy:{createdAt:'asc'},select:{id:true,name:true,description:true,gender:true,minAge:true,maxAge:true,modality:true,modalities:true,priceCents:true,currency:true,capacity:true}},_count:{select:{categories:true,...publicCount}},registrationConfigEventRows:{select:{amountCents:true,currency:true}}}});return {...e,...withParticipantCount(setup),team:e.teamId?await db.team.findUnique({where:{id:e.teamId},select:teamSummary}):null};},
  async list(actor){
   organizer(actor);
   const memberships=await db.teamMember.findMany({where:{userId:actor.id,role:{in:['OWNER','ADMIN']},team:{active:true}},select:{teamId:true}});
   const ids=memberships.map(m=>m.teamId);
   const rows=await db.event.findMany({where:isAdmin(actor)?{}:{OR:[{teamId:null,organizerId:actor.id},{teamId:{in:ids}}]},include:{team:{select:teamSummary}},orderBy:{createdAt:'desc'}});
   return rows.map(e=>({...e,canManage:e.teamId?ids.includes(e.teamId):isAdmin(actor)||e.organizerId===actor.id}));
  },
  async save(actor,id,input){
   administrator(actor);const {maxCapacity,teamId,disciplineId,mode,publicOrganizerName,externalUrl,publicOrganizerPhone,publicOrganizerEmail,...data}=input;
   const existing=id?await db.event.findUnique({where:{id}}):null;
   if(mode!==undefined && !['MANAGED','INFORMATIONAL'].includes(mode))throw new AppError('Modalidad inválida',400,'INVALID_INPUT');
   if(existing && mode!==undefined && mode!==existing.mode)throw new AppError('La modalidad del evento no se cambia',409,'MODE_IMMUTABLE');
   if((existing?.mode || mode)==='INFORMATIONAL') {
    if(teamId || maxCapacity!==undefined || data.status!==undefined)throw new AppError('Usa el formulario y las acciones del evento informativo',400,'INVALID_INPUT');
    const optionalContact=schema=>z.preprocess(value=>typeof value==='string'&&!value.trim()?null:value,schema.nullable());
    const metadata=z.object({publicOrganizerPhone:optionalContact(z.string().trim().max(40).regex(/^[+\d][\d\s().-]*$/,'Escribe un teléfono válido')),publicOrganizerEmail:optionalContact(z.string().trim().email().max(254)),publicOrganizerName:z.string().trim().min(1).max(160),externalUrl:z.string().trim().url().max(2048).refine(value=>{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;},'Usa un enlace HTTP o HTTPS sin credenciales')}).parse({publicOrganizerPhone:publicOrganizerPhone===undefined?existing?.publicOrganizerPhone??null:publicOrganizerPhone,publicOrganizerEmail:publicOrganizerEmail===undefined?existing?.publicOrganizerEmail??null:publicOrganizerEmail,publicOrganizerName:publicOrganizerName??existing?.publicOrganizerName,externalUrl:externalUrl??existing?.externalUrl});
    return commerce.run(null,async tx=>{
     if(id)await lockManagedEvent(tx.database,actor,id);
     const svc=eventsFor(tx.database,{createdByUserId:actor.id,source:'INVICTUS'});
     assertEventLogisticsReady({...existing,...data});
     const saved=id?await svc.update(actor,id,data):await svc.create(actor,data);
     if(disciplineId!==undefined && disciplineId!==saved.disciplineId){
      if(disciplineId!==null && !await tx.database.discipline.findFirst({where:{id:disciplineId,active:true}}))throw new AppError('Disciplina no disponible',400,'INVALID_DISCIPLINE');
     }
     return tx.database.event.update({where:{id:saved.id},data:{mode:'INFORMATIONAL',...metadata,...(disciplineId!==undefined?{disciplineId}:{})},include:{routeImages:{orderBy:{position:'asc'}}}});
    });
   }
   if(publicOrganizerName!==undefined || externalUrl!==undefined || publicOrganizerPhone!==undefined || publicOrganizerEmail!==undefined)throw new AppError('Campos reservados a eventos informativos',400,'INVALID_INPUT');
   if(data.status==='PUBLISHED')throw new AppError('Usa la acción Publicar',409,'REVIEW_REQUIRED');
   if(!capacity.safeParse(maxCapacity).success)throw new AppError('Indica un cupo entre 1 y 1000000',400,'INVALID_CAPACITY');
   if(data.status&&!['DRAFT','PUBLISHED','CLOSED'].includes(data.status))throw new AppError('Estado no disponible',400,'INVALID_STATE');
   return commerce.run(null,async tx=>{
    if(id){const current=await lockManagedEvent(tx.database,actor,id);assertSameTeam(current,teamId);if(current.source==='EXTERNAL')throw new AppError('Los eventos externos se revisan sin modificar su contenido',409,'REVIEW_REQUIRED');}
    else await requireTeamManager(tx.database,actor,teamId,true);
    const svc=eventsFor(tx.database,{teamId,createdByUserId:actor.id,source:'INVICTUS'});
    const event=id?await svc.update(actor,id,data):await svc.create(actor,data);
    await saveEventDiscipline(tx.database,event,disciplineId);
    await registrationsFor(tx.database).service.configure(actor,event.id,{amountCents:0,currency:'PEN',maxCapacity,paymentRecipientId:null});return {...event,...(disciplineId!==undefined?{disciplineId}:{})};
   });
  },
  async managed(actor,id){
   organizer(actor);
   const e=isAdmin(actor)?await db.event.findUnique({where:{id},include:{benefits:true,routeImages:{orderBy:{position:'asc'}}}}):await eventsFor(db).getManaged(actor,id);
   if(!e)throw new AppError('Evento no encontrado',404,'NOT_FOUND');
   return {...e,team:e.teamId?await db.team.findUnique({where:{id:e.teamId},select:teamSummary}):null,configuration:await db.eventRegistrationConfig.findUnique({where:{eventId:id}})};
  },
  async publish(actor,id){administrator(actor);return commerce.run(null,async tx=>{
   const current=await tx.database.event.findUnique({where:{id}});
   if(current?.source==='EXTERNAL')throw new AppError('Aprueba el evento desde la revisión',409,'REVIEW_REQUIRED');
   const locked=await lockManagedEvent(tx.database,actor,id);
   if(locked.mode==='INFORMATIONAL'){
    assertEventLogisticsReady(locked);
    if(locked.startsAt<=new Date() || !locked.publicOrganizerName || !locked.externalUrl)throw new AppError('Completa organizador, enlace y fecha futura',400,'INVALID_INPUT');
    return eventsFor(tx.database).publish(actor,id);
   }
   await assertEventSetupReady(tx.database,locked);
   if(!await tx.database.eventRegistrationConfig.findUnique({where:{eventId:id}}))throw new AppError('Configura el cupo primero',409,'NOT_CONFIGURED');
   return eventsFor(tx.database).publish(actor,id);
  });},
  async unpublish(actor,id){administrator(actor);return commerce.run(null,async tx=>{
   const event=await lockManagedEvent(tx.database,actor,id);
   if(event.mode!=='INFORMATIONAL')throw new AppError('Acción disponible para eventos informativos',409,'INVALID_STATE');
   if(!['DRAFT','PUBLISHED'].includes(event.status))throw new AppError('Evento cerrado',409,'IMMUTABLE_STATE');
   return tx.database.event.update({where:{id},data:{status:'DRAFT'}});
  });},
  async enroll(actor,id,input){
   const event=await db.event.findUnique({where:{id}});
   if(event?.mode==='INFORMATIONAL')throw new AppError('Este evento no recibe inscripciones en Invictus',409,'INFORMATIONAL_EVENT');if(input.participant||await db.eventCategory.count({where:{eventId:id}}))return categoryRegistrations.enroll(actor,id,input);return commerce.run(null,async tx=>{const coordinated=registrationsFor(tx.database);const r=await coordinated.service.create(actor,id,input); // Legacy free registration is auto-confirmed, never attendance.
   const ps=createAthleteProfileService({database:tx.database,files});const p=await ps.getMine(actor)||await ps.save(actor,{});
   const current=await coordinated.service.getOwn(actor,r.id);if(current.status==='CONFIRMED')await coordinated.service.attachProfile(actor,r.id,p.id);
   return coordinated.service.getOwn(actor,r.id);
  });},
  async attendees(actor,id){const rows=await registrations.service.listManaged(actor,id);const users=await db.user.findMany({where:{id:{in:rows.map(r=>r.userId).filter(Boolean)}},select:{id:true,username:true,name:true,lastName:true,email:true,...profileNamesSelect}});return rows.map(r=>({id:r.id,status:r.status,createdAt:r.createdAt,participant:r.participantSnapshot || identityView(users.find(u=>u.id===r.userId))}));},
  history:actor=>db.eventRegistration.findMany({where:{userId:actor.id},select:{id:true,status:true,createdAt:true,categoryId:true,categorySnapshot:true,amountCents:true,currency:true,reviewNote:true,paymentInstructionsSnapshot:true,event:{select:{title:true,startsAt:true,publicSlug:true,status:true,venue:true,primaryImageFileId:true,team:{select:teamSummary}}}},orderBy:{createdAt:'desc'},take:100})
 };
 const users={async list(actor){administrator(actor);return (await db.user.findMany({select:{id:true,username:true,name:true,lastName:true,email:true,role:true,...profileNamesSelect},take:100,orderBy:{createdAt:'desc'}})).map(identityView);},async role(actor,id,role){administrator(actor);if(!['USER','ORGANIZER','ADMIN'].includes(role)||id===actor.id)throw new AppError('Cambio de rol no permitido',400,'INVALID_ROLE');return db.user.update({where:{id},data:{role},select:{id:true,role:true}});}};
 return {personalEvents:createPersonalEvents({db,commerce,eventsFor,registrationsFor}),events,categoryRegistrations,guestRegistrations,profiles,shop,checkout,payments,users,recipients:createRecipientService({store:commerce,fileService:files,resolvePermissions})};
}
