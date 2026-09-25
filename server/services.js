import {createPersonalEvents} from './personal-events.js';
import { createEventService, createPrismaEventStore } from '@base/gestion-eventos';
import { createPrismaRegistrationCoordinator } from '@base/inscripciones-eventos';
import { createProfileService, createPrismaProfileStore } from '@base/perfil-trayectoria';
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
 const registrationsFor=database=>createPrismaRegistrationCoordinator({database,Prisma,commerceStore:createPrismaCommerceStore(database),openPaymentOperation,publicBaseUrl:config.PUBLIC_WEB_URL,resolvePermissions,policy:'reserve-until-terminal',authorizeManage:requireEventManager,autoConfirmFree:true});
 const eventsFor=(database,ownership)=>{
  const store=createPrismaEventStore(database),create=store.events.create;
  store.events.create=async event=>{
   if(!ownership?.teamId)throw new AppError('Selecciona un Team para crear el evento',400,'TEAM_REQUIRED');
   const saved=await create(event);
   const metadata={teamId:ownership.teamId,createdByUserId:ownership.createdByUserId,source:ownership.source};
   await database.event.update({where:{id:saved.id},data:metadata});
   return {...saved,...metadata};
  };
  return createEventService({store,fileService:files,publicBaseUrl:config.PUBLIC_WEB_URL,authorizeManage:(actor,event)=>requireEventManager(database,actor,event)});
 };
 const registrations=registrationsFor(db);
 const profiles=createProfileService({store:createPrismaProfileStore(db),fileService:files,registrationService:registrations.service,canModerate:isAdmin});
 const checkout=createPrismaCheckout({database:db,commerceStore:commerce,createOrderService,openPaymentOperation,recipientId:config.PAYMENT_RECIPIENT_ID,resolvePermissions,policy:'reserve-until-terminal'});
 const payments=createPaymentService({store:commerce,fileService:files,resolvePermissions,methods:config.methods,onResult:registrations.onResult});
 const shop=createStoreService({store:createPrismaStore(db),files,canManage:isAdmin});
 const events={
  async publicList(){return db.event.findMany({where:{status:'PUBLISHED'},select:{id:true,title:true,description:true,publicSlug:true,startsAt:true,timeZone:true,venue:true,primaryImageFileId:true,team:{select:teamSummary}},orderBy:{startsAt:'asc'},take:100});},
  async detail(slug){const e=await eventsFor(db).getPublic(slug);return {...e,team:e.teamId?await db.team.findUnique({where:{id:e.teamId},select:teamSummary}):null};},
  async list(actor){
   organizer(actor);
   const memberships=await db.teamMember.findMany({where:{userId:actor.id,role:{in:['OWNER','ADMIN']},team:{active:true}},select:{teamId:true}});
   const ids=memberships.map(m=>m.teamId);
   const rows=await db.event.findMany({where:isAdmin(actor)?{}:{OR:[{teamId:null,organizerId:actor.id},{teamId:{in:ids}}]},include:{team:{select:teamSummary}},orderBy:{createdAt:'desc'}});
   return rows.map(e=>({...e,canManage:e.teamId?ids.includes(e.teamId):isAdmin(actor)||e.organizerId===actor.id}));
  },
  async save(actor,id,input){
   administrator(actor);const {maxCapacity,teamId,...data}=input;
   if(data.status==='PUBLISHED')throw new AppError('Usa la acción Publicar',409,'REVIEW_REQUIRED');
   if(!capacity.safeParse(maxCapacity).success)throw new AppError('Indica un cupo entre 1 y 1000000',400,'INVALID_CAPACITY');
   if(data.status&&!['DRAFT','PUBLISHED','CLOSED'].includes(data.status))throw new AppError('Estado no disponible',400,'INVALID_STATE');
   return commerce.run(null,async tx=>{
    if(id){const current=await lockManagedEvent(tx.database,actor,id);assertSameTeam(current,teamId);if(current.source==='EXTERNAL')throw new AppError('Los eventos externos se revisan sin modificar su contenido',409,'REVIEW_REQUIRED');}
    else await requireTeamManager(tx.database,actor,teamId,true);
    const svc=eventsFor(tx.database,{teamId,createdByUserId:actor.id,source:'INVICTUS'});
    const event=id?await svc.update(actor,id,data):await svc.create(actor,data);
    await registrationsFor(tx.database).service.configure(actor,event.id,{amountCents:0,currency:'PEN',maxCapacity,paymentRecipientId:null});return event;
   });
  },
  async managed(actor,id){
   organizer(actor);
   const e=isAdmin(actor)?await db.event.findUnique({where:{id},include:{benefits:true}}):await eventsFor(db).getManaged(actor,id);
   if(!e)throw new AppError('Evento no encontrado',404,'NOT_FOUND');
   return {...e,team:e.teamId?await db.team.findUnique({where:{id:e.teamId},select:teamSummary}):null,configuration:await db.eventRegistrationConfig.findUnique({where:{eventId:id}})};
  },
  async publish(actor,id){administrator(actor);return commerce.run(null,async tx=>{
   const current=await tx.database.event.findUnique({where:{id}});
   if(current?.source==='EXTERNAL')throw new AppError('Aprueba el evento desde la revisión',409,'REVIEW_REQUIRED');
   await lockManagedEvent(tx.database,actor,id);
   if(!await tx.database.eventRegistrationConfig.findUnique({where:{eventId:id}}))throw new AppError('Configura el cupo primero',409,'NOT_CONFIGURED');
   return eventsFor(tx.database).publish(actor,id);
  });},
  async enroll(actor,id){return commerce.run(null,async tx=>{const coordinated=registrationsFor(tx.database);const r=await coordinated.service.create(actor,id); // Free registration is auto-confirmed, never attendance.
   const ps=createProfileService({store:createPrismaProfileStore(tx.database),fileService:files});const p=await ps.getMine(actor)||await ps.save(actor,{publicName:actor.name,visibility:'PRIVATE'});
   const current=await coordinated.service.getOwn(actor,r.id);if(current.status==='CONFIRMED')await coordinated.service.attachProfile(actor,r.id,p.id);
   return coordinated.service.getOwn(actor,r.id);
  });},
  async attendees(actor,id){const rows=await registrations.service.listManaged(actor,id);const users=await db.user.findMany({where:{id:{in:rows.map(r=>r.userId)}},select:{id:true,name:true,lastName:true,email:true}});return rows.map(r=>({id:r.id,status:r.status,createdAt:r.createdAt,participant:users.find(u=>u.id===r.userId)}));},
  history:actor=>db.eventRegistration.findMany({where:{userId:actor.id},select:{id:true,status:true,createdAt:true,event:{select:{title:true,startsAt:true,publicSlug:true,team:{select:teamSummary}}}},orderBy:{createdAt:'desc'},take:100})
 };
 const users={list(actor){administrator(actor);return db.user.findMany({select:{id:true,name:true,lastName:true,email:true,role:true},take:100,orderBy:{createdAt:'desc'}});},async role(actor,id,role){administrator(actor);if(!['USER','ORGANIZER','ADMIN'].includes(role)||id===actor.id)throw new AppError('Cambio de rol no permitido',400,'INVALID_ROLE');return db.user.update({where:{id},data:{role},select:{id:true,role:true}});}};
 return {personalEvents:createPersonalEvents({db,commerce,eventsFor,registrationsFor}),events,profiles,shop,checkout,payments,users,recipients:createRecipientService({store:commerce,fileService:files,resolvePermissions})};
}
