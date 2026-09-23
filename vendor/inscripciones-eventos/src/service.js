import { requirePort, normalizePublicBaseUrl } from '@base/usuarios-acceso/contracts';
import QRCode from 'qrcode';
import { RegistrationError } from './errors.js';
const STATES=['PENDING','PENDING_REVIEW','CONFIRMED','REJECTED','CANCELLED','COMPLETED'];
const ACTIVE=['PENDING','PENDING_REVIEW','CONFIRMED'];
const auth=u=>{if(!u)throw new RegistrationError('Autenticación requerida',401,'UNAUTHENTICATED')};
export function createRegistrationService({store,paymentService,fileService,profileReader,onCreated,publicBaseUrl='http://127.0.0.1:3210'}={}){
 requirePort(store,['events.get','registrations.create','registrations.get','registrations.update','registrations.list','registrations.findByEventUser'],'store');
 if(paymentService)requirePort(paymentService,['getInstructions'],'paymentService');
 if(fileService)requirePort(fileService,['assertOwned'],'fileService');
 if(onCreated!==undefined&&typeof onCreated!=='function')throw new TypeError('onCreated debe ser función');
 if(profileReader)requirePort(profileReader,['get'],'profileReader');
 const ownProfile=async(user,id)=>{auth(user);if(!profileReader)throw new RegistrationError('Configura el lector de perfiles',409,'FEATURE_NOT_CONFIGURED');const p=await profileReader.get(id);if(!p||p.userId!==user.id)throw new RegistrationError('Perfil no encontrado',404,'NOT_FOUND');return p};
 publicBaseUrl=normalizePublicBaseUrl(publicBaseUrl);
 const event=async id=>{const e=await store.events.get(id);if(!e)throw new RegistrationError('Evento no encontrado',404,'NOT_FOUND');return e};
 const standalone=e=>{if(e.amountCents>0)throw new RegistrationError('Usa la API coordinada de pagos',409,'PAYMENT_COORDINATOR_REQUIRED')};
 const manage=(u,e)=>{auth(u);if(u.role!=='SUPERADMIN'&&u.id!==e.organizerId)throw new RegistrationError('No puedes gestionar este evento',403,'FORBIDDEN')};
 const count=async id=>(await store.registrations.list()).filter(r=>r.eventId===id&&ACTIVE.includes(r.status)).length;
 return {STATES,
  async create(user,eventId){auth(user);const e=await event(eventId);if(e.amountCents>0&&!onCreated)throw new RegistrationError('Usa el coordinador de pagos',409,'PAYMENT_COORDINATOR_REQUIRED');if(e.status!=='PUBLISHED')throw new RegistrationError('El evento no acepta inscripciones',409,'EVENT_NOT_OPEN');if(await store.registrations.findByEventUser(eventId,user.id))throw new RegistrationError('Ya tienes una inscripción para este evento',409,'DUPLICATE_REGISTRATION');if(e.maxCapacity!==null&&e.maxCapacity!==undefined&&await count(eventId)>=e.maxCapacity)throw new RegistrationError('El evento alcanzó su cupo',409,'CAPACITY_REACHED');const instructions=paymentService?await paymentService.getInstructions(e.paymentRecipientId):null;const r={id:crypto.randomUUID(),eventId,userId:user.id,status:'PENDING',paymentInstructionsSnapshot:instructions,proofFileId:null,participationCode:null,participationQrDataUrl:null,profileId:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const saved=await store.registrations.create(r);return onCreated?await onCreated(saved,e):saved},
  async getOwn(user,id){auth(user);const r=await store.registrations.get(id);if(!r||r.userId!==user.id)throw new RegistrationError('Inscripción no encontrada',404,'NOT_FOUND');return r},
  async submitProof(user,id,fileId){const r=await this.getOwn(user,id);standalone(await event(r.eventId));if(!['PENDING','REJECTED'].includes(r.status))throw new RegistrationError('La inscripción no admite comprobante en este estado',409,'INVALID_STATE');if(typeof fileId!=='string'||!fileId.trim()||fileId.length>100)throw new RegistrationError('Archivo inválido',400,'INVALID_INPUT');if(!fileService)throw new RegistrationError('Configura el adaptador de archivos',409,'FEATURE_NOT_CONFIGURED');await fileService.assertOwned(fileId,user.id,{visibility:'private'});r.proofFileId=fileId;r.status='PENDING_REVIEW';r.updatedAt=new Date().toISOString();return store.registrations.update(id,r)},
  async review(user,id,decision){const r=await store.registrations.get(id);if(!r)throw new RegistrationError('Inscripción no encontrada',404,'NOT_FOUND');const e=await event(r.eventId);manage(user,e);standalone(e);if(!['PENDING_REVIEW','PENDING'].includes(r.status))throw new RegistrationError('La inscripción ya fue revisada',409,'INVALID_STATE');if(!['CONFIRMED','REJECTED'].includes(decision))throw new RegistrationError('Decisión inválida');r.status=decision;r.updatedAt=new Date().toISOString();if(decision==='CONFIRMED'){r.participationCode=`EV-${crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`;r.participationQrDataUrl=await QRCode.toDataURL(`${publicBaseUrl}/participacion/${r.participationCode}`)}return store.registrations.update(id,r)},
  async listManaged(user,eventId){const e=await event(eventId);manage(user,e);return (await store.registrations.list()).filter(r=>r.eventId===eventId)},
  async cancel(user,id){const r=await this.getOwn(user,id);standalone(await event(r.eventId));if(['COMPLETED','CANCELLED'].includes(r.status))throw new RegistrationError('No se puede cancelar',409,'INVALID_STATE');r.status='CANCELLED';r.updatedAt=new Date().toISOString();return store.registrations.update(id,r)},
  async publicValidate(code){const r=(await store.registrations.list()).find(x=>x.participationCode===code&&x.status==='CONFIRMED');if(!r)throw new RegistrationError('Código no válido',404,'NOT_FOUND');const e=await event(r.eventId);return {valid:true,code:r.participationCode,event:{title:e.title,startsAt:e.startsAt,venue:e.venue},status:r.status}},
  async listForProfile(user,profileId){await ownProfile(user,profileId);return (await store.registrations.list()).filter(r=>r.userId===user.id&&r.profileId===profileId&&['CONFIRMED','COMPLETED'].includes(r.status)).map(r=>({id:r.id,eventId:r.eventId,status:r.status,verification:'REGISTRATION_CONFIRMED'}))},
  async attachProfile(user,id,profileId){const r=await this.getOwn(user,id);await ownProfile(user,profileId);if(r.status!=='CONFIRMED')throw new RegistrationError('Solo una inscripción confirmada puede asociarse',409,'INVALID_STATE');return store.registrations.update(id,{...r,profileId,updatedAt:new Date().toISOString()})}
 };
}

