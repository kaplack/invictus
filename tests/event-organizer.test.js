import test from 'node:test';import assert from 'node:assert/strict';import request from 'supertest';import {randomUUID} from 'node:crypto';
import {PrismaClient,Prisma} from '../prisma/client/index.js';import {createApp} from '../server/app.js';import {readConfig} from '../server/config.js';
const url=new URL(process.env.TEST_DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/invictus_test')throw Error('Solo invictus_test local');
const db=new PrismaClient({datasources:{db:{url:url.href}}}),origin='http://localhost:5173';const app=await createApp({database:db,Prisma,config:readConfig({...process.env,DATABASE_URL:url.href,NODE_ENV:'test',STORAGE_DRIVER:'local',WEB_ORIGINS:origin,UPLOAD_DIRECTORY:'.local/test-uploads'})});test.after(()=>db.$disconnect());
const send=(agent,method,path,body={})=>agent[method]('/api'+path).set('Origin',origin).send(body);
async function account(){const agent=request.agent(app);await send(agent,'post','/auth/register',{username:'test_'+randomUUID().replaceAll('-','').slice(0,24),email:randomUUID()+'@example.test',password:'Invictus-Test-2026!'}).expect(201);await send(agent,'put','/profile',{name:'Ana',lastName:'Reglas',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'}).expect(200);return agent;}

test('Team del perfil se guarda por evento y sin Team se muestra el nombre',async()=>{
 const owner=await account(),discipline=(await owner.get('/api/disciplines').expect(200)).body[0];
 const create=async()=> (await send(owner,'post','/events/mine',{title:'Organizador '+randomUUID(),description:'Evento de prueba',startsAt:new Date(Date.now()+172800000).toISOString(),timeZone:'America/Lima',venue:'Lima',maxCapacity:30,disciplineId:discipline.id}).expect(201)).body;
 await send(owner,'put','/profile',{teamName:' COANF '}).expect(200).then(r=>assert.equal(r.body.teamName,'COANF'));
 await send(owner,'put','/profile',{teamName:'x'.repeat(121)}).expect(400);
 const event=await create();assert.equal(event.publicOrganizerName,'Team COANF');
 await send(owner,'put','/profile',{phone:'+51999111222'}).expect(200).then(r=>assert.equal(r.body.teamName,'COANF'));
 await send(owner,'put','/profile',{teamName:''}).expect(200).then(r=>assert.equal(r.body.teamName,null));
 const personal=await create();assert.equal(personal.publicOrganizerName,'Ana Reglas');
 const mine=(await owner.get('/api/events/mine').expect(200)).body;
 assert.equal(mine.find(e=>e.id===event.id).organizerName,'Team COANF');assert.equal(mine.find(e=>e.id===personal.id).organizerName,'Ana Reglas');
 for(const e of [event,personal]){
  await send(owner,'post','/events/'+e.id+'/categories',{name:'Libre',priceCents:0}).expect(201);
  await send(owner,'post','/events/mine/'+e.id+'/publish').expect(200);
  const detail=(await request(app).get('/api/events/public/'+e.publicSlug).expect(200)).body;
  assert.equal(detail.organizerName,e.publicOrganizerName);
 }
 await send(owner,'put','/profile',{teamName:'Team Otro'}).expect(200);
 assert.equal((await create()).publicOrganizerName,'Team Otro');
 await db.event.update({where:{id:personal.id},data:{publicOrganizerName:null}});
 assert.equal((await request(app).get('/api/events/public/'+personal.publicSlug).expect(200)).body.organizerName,'Ana Reglas');
});
