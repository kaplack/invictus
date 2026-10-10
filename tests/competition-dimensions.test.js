import test from 'node:test';import assert from 'node:assert/strict';import request from 'supertest';import {randomUUID} from 'node:crypto';
import {PrismaClient,Prisma} from '../prisma/client/index.js';import {createApp} from '../server/app.js';import {readConfig} from '../server/config.js';
const url=new URL(process.env.TEST_DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/invictus_test')throw Error('Solo invictus_test local');
const db=new PrismaClient({datasources:{db:{url:url.href}}}),origin='http://localhost:5173';const app=await createApp({database:db,Prisma,config:readConfig({...process.env,DATABASE_URL:url.href,NODE_ENV:'test',STORAGE_DRIVER:'local',WEB_ORIGINS:origin,UPLOAD_DIRECTORY:process.env.EVENT_TEST_UPLOAD_DIRECTORY||'.local/test-uploads'})});test.after(()=>db.$disconnect());
const send=(a,m,p,b={})=>a[m]('/api'+p).set('Origin',origin).send(b);
async function account(){const a=request.agent(app);await send(a,'post','/auth/register',{username:'test_'+randomUUID().replaceAll('-','').slice(0,24),email:randomUUID()+'@example.test',password:'Invictus-Test-2026!'}).expect(201);await send(a,'put','/profile',{name:'Ana',lastName:'Logística',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'}).expect(200);return a;}
const upload=async(a,visibility='public')=>(await a.post('/api/files').set('Origin',origin).set('Content-Type','image/png').set('X-File-Name','route.png').set('X-File-Visibility',visibility).send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')).expect(201)).body.file.id;

const rules={genderEnabled:true,ageGroupsEnabled:true,ageGroups:[{minAge:20,maxAge:39},{minAge:40,maxAge:50}]};
const person={name:'Luis',lastName:'Nadador',phone:'999111222',birthDate:'2000-01-01',gender:'MALE'};
async function eventFor(owner,competitionConfig=rules,maxCapacity=4){const discipline=(await request(app).get('/api/disciplines').expect(200)).body[0];return (await send(owner,'post','/events/mine',{title:'Dimensiones '+randomUUID(),description:'Nado',startsAt:'2027-10-01T13:00:00.000Z',venue:'Lima',disciplineId:discipline.id,maxCapacity,competitionConfig}).expect(201)).body;}
async function tokenFor(event){return (await request(app).post('/api/events/'+event.id+'/guest-registration-token').set('Origin',origin).send({}).expect(201)).body.token;}
const guest=(token,method,path,data)=>request(app)[method]('/api'+path).set('Origin',origin).set('X-Registration-Token',token).send(data||{});
async function guestProof(token,event){return (await request(app).post('/api/events/'+event.id+'/guest-proof').set('Origin',origin).set('X-Registration-Token',token).set('Content-Type','image/png').set('X-File-Name','proof.png').send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')).expect(201)).body.file.id;}
test('Distancias, modalidad, clasificación, precio fijo, cupo total y observación',async()=>{
 const owner=await account(),athlete=await account(),outsider=await account();const event=await eventFor(owner),path='/events/mine/'+event.id;
 await send(outsider,'patch',path,{competitionConfig:rules}).expect(403);
 await send(owner,'patch',path,{competitionConfig:{...rules,ageGroups:[{minAge:20,maxAge:40},{minAge:40,maxAge:50}]}}).expect(400);
 await send(owner,'patch',path,{competitionConfig:{...rules,ageGroups:[{minAge:50,maxAge:40}]}}).expect(400);
 const saveCategory=body=>send(owner,'post','/events/'+event.id+'/categories',body);
 await saveCategory({name:'3 km',priceCents:2500,capacity:1}).expect(409);
 await saveCategory({name:'3 km',priceCents:2500,modalities:[{name:'Elite'},{name:'elite'}]}).expect(400);
 const short=(await saveCategory({name:'3 km',priceCents:2500,modalities:[{name:'Elite',description:'Sin wetsuit ni aletas'},{name:'Pro',description:'Sin aletas'}]}).expect(201)).body;
 const long=(await saveCategory({name:'10 km',priceCents:5000,modalities:[{name:'Elite',description:'Sin wetsuit ni aletas'}]}).expect(201)).body;
 const method=(await send(owner,'post','/events/'+event.id+'/payment-methods',{type:'YAPE',label:'Yape',holderName:'Ana',phone:'999111222'}).expect(201)).body;
 await send(owner,'post',path+'/publish').expect(200);
 const detail=(await request(app).get('/api/events/public/'+event.publicSlug).expect(200)).body;assert.deepEqual(detail.competitionConfig,rules);assert.equal(detail.categories[0].modalities.length,2);assert.equal(detail.categories[0].capacity,null);
 await send(owner,'patch',path,{competitionConfig:{...rules,genderEnabled:false}}).expect(409);
 const proof=await upload(athlete,'private'),{name,lastName,...participant}=person;
 await send(athlete,'post','/events/'+event.id+'/register',{categoryId:short.id,modality:'Inexistente',methodId:method.id,proofFileId:proof,participant}).expect(400);
 await send(athlete,'post','/events/'+event.id+'/register',{categoryId:short.id,modality:'Elite',methodId:method.id,proofFileId:proof,participant:{...participant,birthDate:null}}).expect(400);
 const registered=(await send(athlete,'post','/events/'+event.id+'/register',{categoryId:short.id,modality:'Elite',methodId:method.id,proofFileId:proof,participant}).expect(201)).body;assert.equal(registered.amountCents,2500);assert.equal(registered.categorySnapshot.classification.ageGroup,'20–39 años');
 const token=await tokenFor(event),proofId=await guestProof(token,event),input={categoryId:short.id,modality:'Pro',methodId:method.id,proofFileId:proofId,participant:{...person,birthDate:'1970-01-01'}};
 const outside=(await guest(token,'post','/events/'+event.id+'/guest-registrations',input).expect(201)).body;assert.equal(outside.status,'PENDING_REVIEW');assert.equal((await guest(token,'get','/guest-registration').expect(200)).body.amountCents,2500);
 let current=(await send(owner,'get','/registrations/'+outside.id).expect(200)).body;assert.equal(current.categorySnapshot.classification.ageGroup,null);assert.equal(current.categorySnapshot.classificationWarning,'Fuera de los rangos de edad configurados');
 await send(owner,'post','/registrations/'+outside.id+'/review',{version:current.version,decision:'OBSERVED',note:'Confirma tu fecha de nacimiento'}).expect(200);
 current=(await guest(token,'get','/guest-registration').expect(200)).body;
 await guest(token,'post','/guest-registration/resubmit',{version:current.version,participant:{...person,birthDate:'1987-01-01'},proofFileId:await guestProof(token,event)}).expect(200);
 current=(await guest(token,'get','/guest-registration').expect(200)).body;assert.equal(current.categorySnapshot.classification.ageGroup,'40–50 años');assert.equal(current.categorySnapshot.classificationWarning,null);
 await send(owner,'post','/registrations/'+outside.id+'/review',{version:current.version,decision:'CONFIRMED',note:''}).expect(200);
 for(const category of [short,long]){const t=await tokenFor(event);const payload={categoryId:category.id,modality:'Elite',methodId:method.id,proofFileId:await guestProof(t,event),participant:person};const r=(await guest(t,'post','/events/'+event.id+'/guest-registrations',payload).expect(201)).body;assert.equal((await guest(t,'get','/guest-registration').expect(200)).body.amountCents,category.priceCents);}
 const full=await tokenFor(event);await guest(full,'post','/events/'+event.id+'/guest-registrations',{categoryId:short.id,modality:'Elite',methodId:method.id,proofFileId:await guestProof(full,event),participant:person}).expect(409);
 assert.equal(await db.eventRegistration.count({where:{eventId:event.id}}),4);
});
test('Sin divisiones ni distancias: nacimiento privado, revisión y compatibilidad',async()=>{
 const owner=await account(),athlete=await account();const event=await eventFor(owner,{genderEnabled:false,ageGroupsEnabled:false,ageGroups:[]});await send(owner,'post','/events/mine/'+event.id+'/publish').expect(200);
 const token=await tokenFor(event);await guest(token,'post','/events/'+event.id+'/guest-registrations',{participant:{...person,birthDate:'2026-02-30',gender:null}}).expect(400);
 const r=(await guest(token,'post','/events/'+event.id+'/guest-registrations',{participant:{...person,gender:null}}).expect(201)).body;let detail=(await guest(token,'get','/guest-registration').expect(200)).body;assert.equal(detail.participantSnapshot.birthDate,person.birthDate);assert.equal(detail.categorySnapshot.classification.ageGroup,null);assert.equal(detail.categorySnapshot.classification.gender,null);
 const {name,lastName,...participant}=person;const authenticated=(await send(athlete,'post','/events/'+event.id+'/register',{participant:{...participant,gender:null}}).expect(201)).body;assert.equal(authenticated.status,'PENDING_REVIEW');await send(owner,'get','/registrations/'+authenticated.id).expect(200);
 await send(owner,'post','/registrations/'+r.id+'/review',{version:detail.version,decision:'OBSERVED',note:'Confirma nacimiento'}).expect(200);detail=(await guest(token,'get','/guest-registration').expect(200)).body;
 await guest(token,'post','/guest-registration/resubmit',{version:detail.version,participant:{...person,gender:null,birthDate:'1999-01-01'}}).expect(200);
 const publicDetail=(await request(app).get('/api/events/public/'+event.publicSlug).expect(200)).body;assert.equal(publicDetail.participantSnapshot,undefined);
 const legacy=(await send(owner,'post','/events/mine',{title:'Histórico '+randomUUID(),description:'General',startsAt:'2027-10-01T13:00:00Z',venue:'Lima'}).expect(201)).body;assert.equal(legacy.competitionConfig,null);await send(owner,'post','/events/mine/'+legacy.id+'/publish').expect(200);await send(athlete,'post','/events/'+legacy.id+'/register').expect(201);
});
