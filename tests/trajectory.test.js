import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { PrismaClient,Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { createProfileService,createPrismaProfileStore } from '@base/perfil-trayectoria';
const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw Error('Solo invictus_test local');
const db = new PrismaClient({datasources:{db:{url:url.href}}});
const origin = 'http://localhost:5173';
const app = await createApp({database:db,Prisma,config:readConfig({...process.env,DATABASE_URL:url.href,NODE_ENV:'test',STORAGE_DRIVER:'local',WEB_ORIGINS:origin,UPLOAD_DIRECTORY:'.local/test-uploads'})});
test.after(()=>db.$disconnect());
const send = (agent,method,path,body={}) => agent[method]('/api'+path).set('Origin',origin).send(body);
async function account() {
  const agent=request.agent(app), credentials={username:'p_'+randomUUID().replaceAll('-','').slice(0,25),email:randomUUID()+'@example.test',password:'abcdefgh'};
  const {body}=await send(agent,'post','/auth/register',credentials).expect(201);
  return {agent,user:body.user,credentials};
}

test('trayectoria: CRUD propio, cronología, año opcional en fecha y conservación del perfil',async()=>{
 const a=await account(),b=await account();
 assert.deepEqual((await a.agent.get('/api/profile/trajectory').expect(200)).body,[]);
 assert.equal(await db.participantProfile.count({where:{userId:a.user.id}}),0);
 const catalog=(await a.agent.get('/api/disciplines').expect(200)).body;
 const body={eventName:'Maratón histórica',disciplineId:catalog[0].id,year:2020,result:'03:42:00',officialUrl:'example.com/results'};
 const created=(await send(a.agent,'post','/profile/trajectory',body).expect(201)).body;
 assert.equal(created.eventDate,null);assert.equal(created.source,'EXTERNAL');assert.equal(created.verification,'DECLARED');assert.equal(created.officialUrl,'https://example.com/results');assert.ok(!('participantProfileId' in created));
 await send(a.agent,'put','/profile',{name:'Deportista',phone:'+51999999999',websiteUrl:'example.com'}).expect(200);
 const before=(await a.agent.get('/api/profile').expect(200)).body;
 await send(b.agent,'put','/profile/trajectory/'+created.id,body).expect(404);await send(b.agent,'delete','/profile/trajectory/'+created.id).expect(404);
 assert.deepEqual((await b.agent.get('/api/profile/trajectory').expect(200)).body,[]);
 await send(a.agent,'post','/profile/trajectory',{...body,eventName:'Evento reciente',year:2024,eventDate:'2024-02-29'}).expect(201);
 const rows=(await a.agent.get('/api/profile/trajectory').expect(200)).body;assert.deepEqual(rows.map(row=>row.year),[2024,2020]);
 const updated=(await send(a.agent,'put','/profile/trajectory/'+created.id,{...body,result:'03:40:00',position:2}).expect(200)).body;assert.equal(updated.result,'03:40:00');assert.equal(updated.position,2);
 assert.deepEqual((await a.agent.get('/api/profile').expect(200)).body,before);
 await send(a.agent,'delete','/profile/trajectory/'+created.id).expect(204);assert.equal((await a.agent.get('/api/profile/trajectory').expect(200)).body.length,1);
});
test('trayectoria: autenticación, disciplina activa, fechas y URL seguras',async()=>{
 const a=await account(),discipline=(await a.agent.get('/api/disciplines').expect(200)).body[0];
 const body={eventName:'Evento',disciplineId:discipline.id,year:2020};
 await request(app).get('/api/profile/trajectory').expect(401);
 await send(request(app),'post','/profile/trajectory',body).expect(401);
 for(const patch of [{eventName:''},{disciplineId:randomUUID()},{year:9999},{year:1899},{eventDate:'2020-02-30'},{eventDate:'2021-01-01'},{officialUrl:'javascript:alert(1)'},{officialUrl:'https://user:password@example.com'},{position:0},{verification:'VERIFIED'}]) await send(a.agent,'post','/profile/trajectory',{...body,...patch}).expect(400);
 const inactive=await db.discipline.create({data:{code:'TEST_'+randomUUID().slice(0,20),name:'Inactivo trayectoria',active:false}});
 try {await send(a.agent,'post','/profile/trajectory',{...body,disciplineId:inactive.id}).expect(400);} finally {await db.discipline.delete({where:{id:inactive.id}});}
 assert.equal(await db.participantProfile.count({where:{userId:a.user.id}}),0);
});
