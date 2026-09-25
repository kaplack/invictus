import { requirePort, parseInput, normalizePublicBaseUrl } from '@base/usuarios-acceso/contracts';
import { eventInput, eventPatch } from './validation.js';
import QRCode from 'qrcode';
import { EventError } from './errors.js';
const STATES=['DRAFT','PUBLISHED','CLOSED','FINISHED','CANCELLED'];
const BENEFITS=['premio','diploma','reconocimiento','medalla','trofeo','indumentaria','kit','certificado','otro'];
const clean=(v,n,required=true)=>{const x=String(v??'').trim(); if(required&&!x) throw new EventError(`${n} es obligatorio`); return x||null};
const canManage=(u,e)=>{if(!u) throw new EventError('Autenticación requerida',401,'UNAUTHENTICATED'); if(u.role==='SUPERADMIN')return; if(u.id!==e.organizerId)throw new EventError('No puedes gestionar este evento',403,'FORBIDDEN');};
export function createEventService({store, publicBaseUrl='http://127.0.0.1:3200', fileService, authorizeManage=canManage}={}){
  requirePort(store,['events.get','events.getBySlug','events.list','events.create','events.update'],'store');
  publicBaseUrl=normalizePublicBaseUrl(publicBaseUrl);
  if(fileService)requirePort(fileService,['assertOwned'],'fileService');
  const refs=e=>[e.primaryImageFileId,e.bannerImageFileId,...(e.galleryFileIds||[]),...(e.benefits||[]).map(b=>b.imageFileId)].filter(Boolean);
  const checkFiles=async(user,input,previous={})=>{const existing=new Set(refs(previous));const ids=refs(input).filter(id=>!existing.has(id));if(ids.length&&!fileService)throw new EventError('Configura el adaptador de archivos',409,'FEATURE_NOT_CONFIGURED');for(const id of ids)await fileService.assertOwned(id,user.id,{visibility:'public',image:true})};
  const read=async id=>{const e=await store.events.get(id);if(!e)throw new EventError('Evento no encontrado',404,'NOT_FOUND');return e};
  const normalize=input=>{const benefits=(input.benefits??[]).map(b=>({id:b.id??crypto.randomUUID(),kind:BENEFITS.includes(b.kind)?b.kind:'otro',name:clean(b.name,'Nombre del beneficio'),description:clean(b.description,'Descripción del beneficio',false),imageFileId:b.imageFileId??null,condition:clean(b.condition,'Condición',false)})); return {title:clean(input.title,'Título'),description:clean(input.description,'Descripción'),type:clean(input.type,'Tipo',false),startsAt:clean(input.startsAt,'Fecha y hora'),timeZone:clean(input.timeZone,'Zona horaria'),venue:clean(input.venue,'Ubicación',false),virtualUrl:clean(input.virtualUrl,'Enlace virtual',false),primaryImageFileId:input.primaryImageFileId??null,bannerImageFileId:input.bannerImageFileId??null,galleryFileIds:Array.isArray(input.galleryFileIds)?input.galleryFileIds:[],benefits};};
  return { STATES, BENEFITS,
    async create(user,input){if(!user)throw new EventError('Autenticación requerida',401,'UNAUTHENTICATED'); input=parseInput(eventInput,input,EventError);await checkFiles(user,input); const id=crypto.randomUUID(), publicSlug=`${(input.title||'evento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'evento'}-${id.slice(0,8)}`; const e={id,organizerId:user.id,publicSlug,status:'DRAFT',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...normalize(input)}; return store.events.create(e);},
    async update(user,id,input){input=parseInput(eventPatch,input,EventError);const e=await read(id);await authorizeManage(user,e);await checkFiles(user,input,e);if(['CLOSED','FINISHED','CANCELLED'].includes(e.status))throw new EventError('El evento cerrado, finalizado o cancelado no puede editarse',409,'IMMUTABLE_STATE'); if(input.status!==undefined&&!STATES.includes(input.status))throw new EventError('Estado inválido'); const next={...e,...normalize({...e,...input}),status:input.status??e.status,updatedAt:new Date().toISOString()}; if(input.status==='PUBLISHED'&&(!next.startsAt||!next.timeZone))throw new EventError('Fecha y zona horaria son obligatorias para publicar'); return store.events.update(id,next);},
    async publish(user,id){return this.update(user,id,{status:'PUBLISHED'});},
    async listMine(user){if(!user)throw new EventError('Autenticación requerida',401,'UNAUTHENTICATED');const all=await store.events.list(),allowed=[];for(const e of all){try{await authorizeManage(user,e);allowed.push(e)}catch(error){if(![403,404].includes(error.status))throw error}}return allowed;},
    async getPublic(slug){const e=await store.events.getBySlug(slug);if(!e||e.status!=='PUBLISHED')throw new EventError('Evento público no encontrado',404,'NOT_FOUND');return {...e,publicUrl:`${publicBaseUrl}/eventos/${e.publicSlug}`,qrDataUrl:await QRCode.toDataURL(`${publicBaseUrl}/eventos/${e.publicSlug}`)};},
    async getManaged(user,id){const e=await read(id);await authorizeManage(user,e);return e;}, canManage:authorizeManage
  };
}

