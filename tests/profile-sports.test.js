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
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function image(actor,visibility='public') {
  return (await actor.agent.post('/api/files').set('Origin',origin).set('Content-Type','image/png').set('X-File-Name','perfil.png').set('X-File-Visibility',visibility).send(png).expect(201)).body.file.id;
}


test('deportes: catálogo, CRUD, principal único, aislamiento e independencia del perfil',async()=>{
 const a=await account(),b=await account();
 const catalog=(await request(app).get('/api/disciplines').expect(200)).body;
 assert.ok(catalog.length>=2);const [first,second]=catalog;
 const inactive=await db.discipline.create({data:{code:'TEST_'+randomUUID().slice(0,20),name:'Deporte inactivo test',active:false}});
 assert.ok(!(await request(app).get('/api/disciplines').expect(200)).body.some(row=>row.id===inactive.id));
 const empty=(await send(a.agent,'put','/profile',{}).expect(200)).body;
 assert.deepEqual(empty.disciplines,[]);
 await request(app).put('/api/profile').set('Origin',origin).send({disciplines:[]}).expect(401);
 const put=disciplines=>send(a.agent,'put','/profile',{disciplines});
 await put([{disciplineId:inactive.id,isPrimary:false}]).expect(400);
 await put([{disciplineId:randomUUID(),isPrimary:false}]).expect(400);
 await put([{disciplineId:first.id,isPrimary:true}]).expect(200);
 const two=[{disciplineId:first.id,isPrimary:true},{disciplineId:second.id,isPrimary:false}];
 await put(two).expect(200);await put(two).expect(200);
 assert.equal(await db.participantDiscipline.count({where:{participantProfileId:empty.id}}),2);
 await put([{disciplineId:first.id,isPrimary:false},{disciplineId:first.id,isPrimary:false}]).expect(400);
 await put(two.map(row=>({...row,isPrimary:true}))).expect(400);
 await assert.rejects(db.participantDiscipline.create({data:{participantProfileId:empty.id,disciplineId:first.id}}),e=>e.code==='P2002');
 await assert.rejects(db.participantDiscipline.update({where:{participantProfileId_disciplineId:{participantProfileId:empty.id,disciplineId:second.id}},data:{isPrimary:true}}),e=>e.code==='P2002');
 const changed=(await put(two.map(row=>({...row,isPrimary:row.disciplineId===second.id}))).expect(200)).body;
 assert.equal(changed.disciplines.filter(row=>row.isPrimary)[0].id,second.id);
 const avatarFileId=await image(a),bannerFileId=await image(a);
 await send(a.agent,'put','/profile',{name:'Alan',avatarFileId,bannerFileId,websiteUrl:'example.com',socialLinks:[{platform:'INSTAGRAM',url:'alan'}]}).expect(200);
 await send(a.agent,'put','/profile',{phone:'+51980784509'}).expect(200);
 const preserved=(await a.agent.get('/api/profile').expect(200)).body;
 assert.deepEqual(preserved.disciplines,changed.disciplines);assert.equal(preserved.websiteUrl,'https://example.com/');assert.equal(preserved.socialLinks.length,1);
 assert.equal(preserved.avatarFileId,avatarFileId);assert.equal(preserved.bannerFileId,bannerFileId);assert.equal(preserved.phone,'+51980784509');
 const target=(await send(b.agent,'put','/profile',{}).expect(200)).body;
 await send(a.agent,'put','/profile',{participantProfileId:target.id,disciplines:[{disciplineId:first.id,isPrimary:false}]}).expect(200);
 assert.deepEqual((await b.agent.get('/api/profile').expect(200)).body.disciplines,[]);
 const noPrimary=(await a.agent.get('/api/profile').expect(200)).body;
 assert.equal(noPrimary.disciplines.length,1);assert.equal(noPrimary.disciplines[0].isPrimary,false);
 assert.ok((await request(app).get('/api/disciplines').expect(200)).body.some(row=>row.id===second.id));
 await db.discipline.update({where:{id:inactive.id},data:{active:true}});
 await put([{disciplineId:inactive.id,isPrimary:false}]).expect(200);
 await db.discipline.update({where:{id:inactive.id},data:{active:false}});
 const retained=(await put([{disciplineId:inactive.id,isPrimary:false}]).expect(200)).body;
 assert.equal(retained.disciplines[0].active,false);
 await put([]).expect(200);
 assert.deepEqual((await a.agent.get('/api/profile').expect(200)).body.disciplines,[]);
});
test('migración: coincidencias inequívocas y JSON histórico intacto',async()=>{
 const connection=new pg.Client({connectionString:url.href});await connection.connect();
 const sql=await readFile(new URL('../prisma/migrations/20261002026_participant_disciplines/migration.sql',import.meta.url),'utf8');
 try{
  await connection.query('BEGIN');await connection.query('CREATE SCHEMA sports_migration_test');await connection.query('SET LOCAL search_path TO sports_migration_test');
  await connection.query('CREATE TABLE participant_profiles(id uuid PRIMARY KEY,disciplines jsonb)');
  await connection.query('CREATE TABLE disciplines(id uuid PRIMARY KEY,code text,name text)');
  const id=randomUUID(),sport=randomUUID(),ambiguous=randomUUID();
  const archive=['Running','Running','SWIMMING','desconocido'];
  await connection.query('INSERT INTO participant_profiles VALUES($1,$2)',[id,JSON.stringify(archive)]);
  await connection.query("INSERT INTO disciplines VALUES($1,'RUNNING','Running'),($2,'SWIMMING','Natación'),($3,'OTHER','SWIMMING')",[sport,ambiguous,randomUUID()]);
  await connection.query(sql);
  const rows=(await connection.query('SELECT * FROM participant_disciplines')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].discipline_id,sport);assert.equal(rows[0].is_primary,false);
  assert.deepEqual((await connection.query('SELECT disciplines FROM participant_profiles')).rows[0].disciplines,archive);
 }finally{await connection.query('ROLLBACK');await connection.end();}
});
