import { requirePort, parseInput } from '@base/usuarios-acceso/contracts';
import { profileInput } from './validation.js';
import {ProfileError} from './errors.js';
const auth=u=>{if(!u)throw new ProfileError('Autenticación requerida',401,'UNAUTHENTICATED')};
const cleanText=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export function createProfileService({store,fileService,registrationService,canModerate=u=>['ADMIN','SUPERADMIN'].includes(u.role)}={}){
 requirePort(store,['profiles.get','profiles.getByUser','profiles.upsert'],'store');
 if(fileService)requirePort(fileService,['assertOwned'],'fileService');
 if(registrationService)requirePort(registrationService,['listForProfile'],'registrationService');
 if(typeof canModerate!=='function')throw new TypeError('canModerate debe ser función');
 const own=(u,p)=>{auth(u);if(!p||p.userId!==u.id)throw new ProfileError('Perfil no encontrado',404,'NOT_FOUND');return p};
 const validateFiles=async(u,ids=[],options={})=>{if(ids.some(Boolean)&&!fileService)throw new ProfileError('Configura el adaptador de archivos',409,'FEATURE_NOT_CONFIGURED');for(const id of ids.filter(Boolean))await fileService.assertOwned(id,u.id,options)};
 return {
  async getMine(u){auth(u);return (await store.profiles.getByUser(u.id))||null},
  async save(u,input){auth(u);input=parseInput(profileInput,input,ProfileError);const current=await store.profiles.getByUser(u.id);if(current?.moderationStatus==='HIDE'&&input.visibility==='PUBLIC')throw new ProfileError('El perfil requiere revisión para publicarse',409,'MODERATION_REQUIRED');const id=current?.id||crypto.randomUUID();const docs=Array.isArray(input.documentFileIds)?input.documentFileIds.filter(x=>typeof x==='string').slice(0,20):current?.documentFileIds||[];await validateFiles(u,[input.avatarFileId],{visibility:'public',image:true});await validateFiles(u,docs,{visibility:'private'});const p={id,userId:u.id,publicName:cleanText(input.publicName,120),bio:cleanText(input.bio,2000),location:cleanText(input.location,120),disciplines:Array.isArray(input.disciplines)?input.disciplines.map(x=>cleanText(x,80)).filter(Boolean).slice(0,20):[],experience:cleanText(input.experience,3000),achievements:cleanText(input.achievements,3000),avatarFileId:input.avatarFileId===undefined?(current?.avatarFileId||null):input.avatarFileId,documentFileIds:docs,publicLink:cleanText(input.publicLink,500)||null,visibility:input.visibility==='PUBLIC'?'PUBLIC':'PRIVATE',moderationStatus:current?.moderationStatus||'PENDING',updatedAt:new Date().toISOString(),createdAt:current?.createdAt||new Date().toISOString()};return store.profiles.upsert(p)},
  async getPublic(id){const p=await store.profiles.get(id);if(!p||p.visibility!=='PUBLIC')throw new ProfileError('Perfil no encontrado',404,'NOT_FOUND');return {...p,userId:undefined,documentFileIds:undefined}},
  async participation(u){auth(u);if(!registrationService)return[];const p=await store.profiles.getByUser(u.id);if(!p)return[];return (await registrationService.listForProfile(u,p.id)).map(r=>({id:r.id,eventId:r.eventId,status:r.status,verification:r.verification||'REGISTRATION_CONFIRMED'}))},
  async moderate(u,id,decision){auth(u);if(!await canModerate(u))throw new ProfileError('Permiso insuficiente',403,'FORBIDDEN');if(!['HIDE','PUBLISH'].includes(decision))throw new ProfileError('Decisión inválida',400,'INVALID_INPUT');const p=await store.profiles.get(id);if(!p)throw new ProfileError('Perfil no encontrado',404,'NOT_FOUND');if(decision==='HIDE')p.visibility='PRIVATE';if(decision==='PUBLISH')p.visibility='PUBLIC';p.moderationStatus=decision;return store.profiles.upsert(p)}
 };
}


