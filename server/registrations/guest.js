import { randomBytes, randomUUID, createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { openPaymentOperation } from '@base/pagos-manuales';
import { prepareRegistration, participantInput, enrollmentInput, correctionInput, reservedStates, audit, fail, validateParticipant, paymentCodes } from './policy.js';

// Capability belongs to one event/enrollment. Only its hash is persisted; no synthetic User/Profile.
export function createGuestRegistrations({ database: db, commerce, categoryRegistrations, paymentsFor, files, config }) {
 const person = z.object({name:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(120),phone:z.string().trim().regex(/^\+?[0-9][0-9 ()-]{5,24}$/),birthDate:participantInput.shape.birthDate,gender:participantInput.shape.gender}).strict();
 const inputSchema=enrollmentInput.extend({categoryId:z.uuid().nullable().default(null),participant:person});
 const signature=payload=>createHmac('sha256',config.FILE_SIGNING_KEY).update('guest-registration:'+payload).digest('hex');
 function identity(token,eventId) {
  if(typeof token!=='string'||token.length>300)fail('Enlace privado no disponible','NOT_FOUND',404);
  const [id,nonce,sig,...extra]=token.split('.'),payload=id+'.'+nonce;
  if(extra.length||!z.uuid().safeParse(id).success||!/^[a-f0-9]{64}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(sig||'')||(eventId&&id!==eventId)||!timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(signature(payload),'hex')))fail('Enlace privado no disponible','NOT_FOUND',404);
  return {id:null,eventId:id,guestAccessHash:createHash('sha256').update(token).digest('hex')};
 }
 async function open(eventId){const e=await db.event.findUnique({where:{id:z.uuid().parse(eventId)},include:{team:true}});if(!e||e.mode==='INFORMATIONAL'||e.status!=='PUBLISHED'||e.startsAt<=new Date()||(e.teamId&&!e.team?.active))fail('El evento no acepta inscripciones','EVENT_NOT_OPEN');return e;}
 async function own(token){const actor=identity(token);const r=await db.eventRegistration.findUnique({where:{guestAccessHash:actor.guestAccessHash},include:{event:true}});if(!r||r.eventId!==actor.eventId)fail('Inscripción no disponible','NOT_FOUND',404);return {actor,r};}
 async function sendContent(id){const f=await db.storedFile.findUnique({where:{id}});if(!f||f.deletedAt)fail('Archivo no disponible','NOT_FOUND',404);const actor={id:f.ownerId,guestAccessHash:f.guestAccessHash},access=await files.access(id,actor);return files.content(id,actor,Object.fromEntries(new URLSearchParams(access.path.split('?')[1])));}
 return {
  async start(eventId){await open(eventId);const payload=eventId+'.'+randomBytes(32).toString('hex');return {token:payload+'.'+signature(payload)};},
  async options(eventId){return categoryRegistrations.options(null,eventId);},
  async upload(token,eventId,input){const actor=identity(token,eventId);const registration=await db.eventRegistration.findUnique({where:{guestAccessHash:actor.guestAccessHash},include:{event:true}});if(registration){if(registration.status!=='OBSERVED'||['CANCELLED','FINISHED','CLOSED'].includes(registration.event.status))fail('La inscripción no admite otro comprobante');}else await open(eventId);if(await db.storedFile.count({where:{guestAccessHash:actor.guestAccessHash,deletedAt:null}})>=10)fail('Se alcanzó el límite de comprobantes','UPLOAD_LIMIT',429);return files.upload(actor,{...input,visibility:'private'});},
  async enroll(token,eventId,raw){const actor=identity(token,eventId),input=inputSchema.parse(raw);return commerce.run(null,async tx=>{
   const previous=await tx.database.eventRegistration.findUnique({where:{guestAccessHash:actor.guestAccessHash}});
   if(previous){if(previous.eventId!==eventId||previous.categoryId!==input.categoryId||previous.methodId!==input.methodId||(previous.categorySnapshot?.classification?.modality??null)!==input.modality)fail('Ya enviaste esta inscripción','DUPLICATE_REGISTRATION');return {id:previous.id,status:previous.status};}
   const event=await open(eventId);
   const configuration=await tx.database.eventRegistrationConfig.findUnique({where:{eventId}});
   if(!configuration)fail('Evento sin configuración','NOT_CONFIGURED');
   if(configuration.maxCapacity!==null&&await tx.database.eventRegistration.count({where:{eventId,status:{in:reservedStates}}})>=configuration.maxCapacity)fail('Cupo agotado','CAPACITY_REACHED');
   const {name,lastName,...participant}=input.participant;
   if(!input.categoryId&&(await tx.database.eventCategory.count({where:{eventId}})||configuration.amountCents!==0||input.modality||input.methodId||input.proofFileId))fail('Selecciona una distancia','INVALID_INPUT',400);
   const prepared=await prepareRegistration(tx,{name,lastName},eventId,{...input,participant});
   const r=await tx.database.eventRegistration.create({data:{id:randomUUID(),eventId,userId:null,guestAccessHash:actor.guestAccessHash,status:'PENDING',...prepared.data,participantSnapshot:{name,lastName,...participant}}});
   if(r.amountCents>0){const operation=await openPaymentOperation(tx,{id:r.id,sourceType:'registration',sourceId:r.id,payerId:null,recipientId:prepared.event.paymentRecipientId,amountCents:r.amountCents,currency:r.currency,...prepared.payment});await tx.database.eventRegistration.update({where:{id:r.id},data:{paymentInstructionsSnapshot:operation.instructions}});await paymentsFor(tx.database).register(actor,r.id,{method:paymentCodes[operation.instructions.type],proofFileId:input.proofFileId});}
   else {await audit(tx,r,null,'PENDING_REVIEW');await tx.database.eventRegistration.update({where:{id:r.id},data:{status:'PENDING_REVIEW',version:{increment:1}}});}
   return {id:r.id,status:'PENDING_REVIEW'};
  });},
  async get(token){const {r}=await own(token);const payments=await db.manualPayment.findMany({where:{operationId:r.id},orderBy:{createdAt:'desc'},select:{id:true,status:true,createdAt:true,proofFileId:true,rejectionReason:true}});return {id:r.id,status:r.status,version:r.version,reviewNote:r.reviewNote,participantSnapshot:r.participantSnapshot,categorySnapshot:r.categorySnapshot,amountCents:r.amountCents,currency:r.currency,paymentInstructionsSnapshot:r.paymentInstructionsSnapshot,event:{title:r.event.title,publicSlug:r.event.publicSlug,startsAt:r.event.startsAt,venue:r.event.venue},payments};},
  async proof(token,paymentId){const {r}=await own(token);const p=await db.manualPayment.findFirst({where:{id:z.uuid().parse(paymentId),operationId:r.id}});if(!p?.proofFileId)fail('Comprobante no disponible','NOT_FOUND',404);return sendContent(p.proofFileId);},
  async qr(token){const {r}=await own(token);if(!r.paymentInstructionsSnapshot?.qrFileId)fail('QR no disponible','NOT_FOUND',404);return sendContent(r.paymentInstructionsSnapshot.qrFileId);},
  async resubmit(token,raw){const {actor,r:initial}=await own(token);const input=correctionInput.extend({participant:person}).parse(raw);return commerce.run(initial.id,async tx=>{
   const r=await tx.database.eventRegistration.findUnique({where:{id:initial.id},include:{event:true}});if(r.status!=='OBSERVED'||r.version!==input.version)fail('La inscripción cambió; vuelve a cargarla','STALE_REGISTRATION');if(['CANCELLED','FINISHED','CLOSED'].includes(r.event.status))fail('El evento está cerrado');const categorySnapshot=validateParticipant(r.categorySnapshot,input.participant,r.categorySnapshot.eventDate);const updated=await tx.database.eventRegistration.update({where:{id:r.id},data:{categorySnapshot,participantSnapshot:input.participant}});
   if(r.amountCents>0)await paymentsFor(tx.database).register(actor,r.id,{method:paymentCodes[r.paymentInstructionsSnapshot.type],proofFileId:input.proofFileId});else{if(input.proofFileId)fail('La inscripción gratuita no requiere comprobante','INVALID_INPUT',400);await audit(tx,updated,null,'PENDING_REVIEW');await tx.database.eventRegistration.update({where:{id:r.id},data:{status:'PENDING_REVIEW',reviewNote:null,version:{increment:1}}});}return {id:r.id,status:'PENDING_REVIEW'};
  });}
 };
}
