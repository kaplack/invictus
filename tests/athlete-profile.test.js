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

test('perfil: edición independiente, datos privados, imágenes, username, login y perfil incompleto',async()=>{
  const a=await account(),b=await account();
  await request(app).get('/api/profile').expect(401);
  await request(app).get('/api/profile/location-catalog').expect(401);
  assert.equal((await a.agent.get('/api/profile').expect(200)).body,null);
  const incomplete=(await send(a.agent,'put','/profile',{}).expect(200)).body;
  assert.equal(incomplete.name,null);assert.equal(incomplete.phone,null);assert.equal(incomplete.visibility,'PRIVATE');
  const avatarFileId=await image(a),bannerFileId=await image(a);
  const info={name:'Alan',lastName:'Burga',dateOfBirth:'1979-07-15',gender:'MALE',documentType:'DNI',documentNumber:'12345678',bio:'Soy runner',avatarFileId};
  const first=(await send(a.agent,'put','/profile',info).expect(200)).body;
  for(const [key,value] of Object.entries(info))assert.equal(first[key],value);
  const user=await db.user.findUnique({where:{id:a.user.id}});
  assert.equal(user.name,'Alan');assert.equal(user.lastName,'Burga');
  assert.equal(first.publicName,'Alan Burga');
  const catalog=(await a.agent.get('/api/profile/location-catalog').expect(200)).body;
  const bellavista=catalog.ubigeos.find(row=>row.code==='070102');
  assert.deepEqual(bellavista,{code:'070102',department:'Callao',province:'Callao',district:'Bellavista'});
  const contact={phone:'+51980784509',countryCode:'PE',department:'Callao',province:'Callao',district:'Bellavista',ubigeoCode:'070102'};
  const second=(await send(a.agent,'put','/profile',contact).expect(200)).body;
  for(const [key,value] of Object.entries({...info,...contact}))assert.equal(second[key],value);
  const third=(await send(a.agent,'put','/profile',{bannerFileId}).expect(200)).body;
  assert.equal(third.avatarFileId,avatarFileId);assert.equal(third.bannerFileId,bannerFileId);assert.equal(third.documentNumber,'12345678');
  await a.agent.delete('/api/files/'+bannerFileId).set('Origin',origin).set('Content-Type','application/json').send({}).expect(409);
  const otherFile=await image(b);await send(a.agent,'put','/profile',{bannerFileId:otherFile}).expect(404);
  const privateFile=await image(a,'private');await send(a.agent,'put','/profile',{bannerFileId:privateFile}).expect(400);
  for(const bad of [
    {documentNumber:'1234567'}, {documentNumber:'abcdefgh'}, {documentType:null},
    {dateOfBirth:'2025-02-30'},{dateOfBirth:'2999-01-01'},{gender:'free text'},
    {phone:'980784509'}, {countryCode:'XX'}, {ubigeoCode:'999999'},
    {department:'Lima',ubigeoCode:'070102'}, {username:'invalid-name'}
  ]) await send(a.agent,'put','/profile',bad).expect(400);
  await send(a.agent,'put','/profile',{documentType:'PASSPORT',documentNumber:'AB-12345'}).expect(200);
  await send(a.agent,'put','/profile',{documentType:'FOREIGN_RESIDENT_CARD',documentNumber:'001234567'}).expect(200);
  await send(a.agent,'put','/profile',{documentType:'DNI',documentNumber:'12345678'}).expect(200);
  await a.agent.get('/api/profile/username-availability').query({username:a.user.username}).expect(200).then(r=>assert.equal(r.body.available,true));
  await a.agent.get('/api/profile/username-availability').query({username:b.user.username}).expect(200).then(r=>assert.equal(r.body.available,false));
  await send(a.agent,'put','/profile',{username:a.user.username.toUpperCase()}).expect(200);
  await send(a.agent,'put','/profile',{username:b.user.username,name:'No guardar'}).expect(409);
  assert.equal((await a.agent.get('/api/profile').expect(200)).body.name,'Alan');
  const next='p_'+randomUUID().replaceAll('-','').slice(0,25);
  const updated=(await send(a.agent,'put','/profile',{username:' '+next.toUpperCase()+' '}).expect(200)).body;
  assert.equal(updated.username,next);
  assert.equal((await a.agent.get('/api/auth/session').expect(200)).body.user.username,next);
  await send(a.agent,'post','/auth/logout').expect(204);
  const login=(await send(a.agent,'post','/auth/login',{email:a.credentials.email,password:a.credentials.password}).expect(200)).body;
  assert.equal(login.user.username,next);assert.equal(login.user.name,'Alan');
  assert.equal((await a.agent.get('/api/profile').expect(200)).body.dateOfBirth,'1979-07-15');
  // Verify both the reusable serializer and the actual public surfaces.
  await db.participantProfile.update({where:{userId:a.user.id},data:{visibility:'PUBLIC',location:'Privado'}});
  const publicProfile=await createProfileService({store:createPrismaProfileStore(db)}).getPublic(first.id);
  for(const key of ['email','userId','dateOfBirth','gender','documentType','documentNumber','phone','countryCode','department','province','district','ubigeoCode','location','documentFileIds'])
    assert.equal(Object.hasOwn(publicProfile,key),false,key);
  const team=(await send(a.agent,'post','/teams',{name:'Privacidad perfil',discoverable:true,joinPolicy:'APPROVAL'}).expect(201)).body;
  const publicTeam=(await request(app).get('/api/teams/public/'+team.id).expect(200)).body;
  const publicJson=JSON.stringify(publicTeam);
  for(const secret of ['12345678','1979-07-15','+51980784509',a.credentials.email])
    assert.equal(publicJson.includes(secret),false);
  await send(a.agent,'put','/profile',{countryCode:'CL',department:'Metropolitana',province:'Santiago',district:'Providencia',ubigeoCode:null}).expect(200);
  assert.equal((await a.agent.get('/api/profile').expect(200)).body.ubigeoCode,null);
  const sameUsername='race_'+randomUUID().replaceAll('-','').slice(0,20);
  const concurrent=await Promise.all([send(a.agent,'put','/profile',{username:sameUsername}),send(b.agent,'put','/profile',{username:sameUsername})]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
});

test('migración: nombres y datos históricos intactos, sin adivinar UBIGEO',async()=>{
  const connection=new pg.Client({connectionString:url.href});await connection.connect();
  const sql=await readFile(new URL('../prisma/migrations/20261001024_athlete_profile/migration.sql',import.meta.url),'utf8');
  try {
    for(const populated of [false,true]) {
      await connection.query('BEGIN');
      await connection.query('CREATE SCHEMA profile_migration_test');
      await connection.query('SET LOCAL search_path TO profile_migration_test');
      await connection.query('CREATE TABLE users (id uuid PRIMARY KEY,name varchar(80),last_name varchar(120))');
      await connection.query('CREATE TABLE stored_files (id uuid PRIMARY KEY)');
      await connection.query("CREATE TABLE participant_profiles (id uuid PRIMARY KEY,user_id uuid,public_name text,location text,bio text,avatar_file_id uuid,disciplines jsonb,achievements text)");
      const userId=randomUUID(),profileId=randomUUID(),avatarId=randomUUID();
      if(populated) {
        await connection.query("INSERT INTO users VALUES ($1,'Ana','Burga')",[userId]);
        await connection.query('INSERT INTO stored_files VALUES ($1)',[avatarId]);
        await connection.query("INSERT INTO participant_profiles VALUES ($1,$2,'Nombre histórico','Bellavista','Mi bio',$3,'[]','Histórico')",[profileId,userId,avatarId]);
      }
      const before=(await connection.query('SELECT * FROM participant_profiles')).rows;
      await connection.query(sql);
      const after=(await connection.query('SELECT * FROM participant_profiles')).rows;
      if(populated) {
        for(const [key,value] of Object.entries(before[0]))assert.deepEqual(after[0][key],value);
        assert.equal(after[0].name,'Ana');assert.equal(after[0].last_name,'Burga');assert.equal(after[0].ubigeo_code,null);
      } else assert.equal(after.length,0);
      await connection.query('ROLLBACK');
    }
  } finally {await connection.query('ROLLBACK');await connection.end();}
});
