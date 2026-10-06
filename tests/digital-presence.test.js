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


test('presencia digital: perfil vacío, normalización, CRUD, unicidad y guardados independientes',async()=>{
 const a=await account(),b=await account();
 await request(app).put('/api/profile').set('Origin',origin).send({websiteUrl:'example.com'}).expect(401);
 const empty=(await send(a.agent,'put','/profile',{}).expect(200)).body;
 assert.equal(empty.websiteUrl,null);assert.deepEqual(empty.socialLinks,[]);
 const website=(await send(a.agent,'put','/profile',{websiteUrl:'example.com'}).expect(200)).body;
 assert.equal(website.websiteUrl,'https://example.com/');
 for(const value of ['alanburga','@alanburga','http://www.instagram.com/alanburga?utm_source=x']) {
  const result=(await send(a.agent,'put','/profile',{socialLinks:[{platform:'INSTAGRAM',url:value}]}).expect(200)).body;
  assert.deepEqual(result.socialLinks,[{platform:'INSTAGRAM',url:'https://instagram.com/alanburga'}]);
 }
 const links=[{platform:'INSTAGRAM',url:'@alanburga'},{platform:'TIKTOK',url:'@alanburga'},{platform:'FACEBOOK',url:'https://www.facebook.com/profile.php?id=12345'},{platform:'YOUTUBE',url:'https://youtube.com/@alanburga'},{platform:'LINKEDIN',url:'https://www.linkedin.com/in/alanburga/'}];
 const saved=(await send(a.agent,'put','/profile',{websiteUrl:'https://alanburga.com',socialLinks:links}).expect(200)).body;
 assert.equal(saved.socialLinks.length,5);assert.equal(saved.websiteUrl,'https://alanburga.com/');
 assert.equal(saved.socialLinks.find(link=>link.platform==='TIKTOK').url,'https://tiktok.com/@alanburga');
 assert.ok(saved.socialLinks.every(link=>Object.keys(link).sort().join(',')==='platform,url'));
 const avatarFileId=await image(a),bannerFileId=await image(a);
 await send(a.agent,'put','/profile',{name:'Alan',avatarFileId}).expect(200);
 await send(a.agent,'put','/profile',{phone:'+51980784509'}).expect(200);
 await send(a.agent,'put','/profile',{bannerFileId}).expect(200);
 const read=(await a.agent.get('/api/profile').expect(200)).body;
 assert.deepEqual(read.socialLinks,saved.socialLinks);assert.equal(read.websiteUrl,saved.websiteUrl);
 assert.equal(read.name,'Alan');assert.equal(read.phone,'+51980784509');assert.equal(read.avatarFileId,avatarFileId);assert.equal(read.bannerFileId,bannerFileId);
 const changed=(await send(a.agent,'put','/profile',{socialLinks:[{platform:'INSTAGRAM',url:'otro_usuario'},{platform:'TIKTOK',url:''}]}).expect(200)).body;
 assert.deepEqual(changed.socialLinks,[{platform:'INSTAGRAM',url:'https://instagram.com/otro_usuario'}]);
 await send(a.agent,'put','/profile',{socialLinks:[{platform:'INSTAGRAM',url:'uno'},{platform:'INSTAGRAM',url:'dos'}]}).expect(400);
 await assert.rejects(db.participantSocialLink.create({data:{participantProfileId:changed.id,platform:'INSTAGRAM',url:'https://instagram.com/duplicado'}}),e=>e.code==='P2002');
 const cleared=(await send(a.agent,'put','/profile',{websiteUrl:'',socialLinks:[]}).expect(200)).body;
 assert.equal(cleared.websiteUrl,null);assert.deepEqual(cleared.socialLinks,[]);assert.equal(cleared.avatarFileId,avatarFileId);
 assert.equal((await b.agent.get('/api/profile').expect(200)).body,null);
});
test('URLs: protocolos, dominios engañosos, credenciales y enlaces ajenos rechazados',async()=>{
 const a=await account();
 for(const websiteUrl of ['javascript:alert(1)','data:text/plain,test','file:///tmp/test','https://user:pass@example.com','https://example.com:8080','https://example.com/\\evil'])
  await send(a.agent,'put','/profile',{websiteUrl}).expect(400);
 for(const [platform,url] of [['INSTAGRAM','https://instagram.com.evil.test/alan'],['TIKTOK','https://example.com/@alan'],['FACEBOOK','https://facebook.com/l.php?u=https://evil.test'],['YOUTUBE','https://youtu.be/video'],['YOUTUBE','https://youtube.com/watch?v=abc'],['LINKEDIN','javascript:alert(1)'],['INSTAGRAM','https://instagram.com/reel/abc']])
  await send(a.agent,'put','/profile',{socialLinks:[{platform,url}]}).expect(400);
 await send(a.agent,'put','/profile',{socialLinks:[{platform:'STRAVA',url:'https://strava.com/a'}]}).expect(400);
 assert.equal((await a.agent.get('/api/profile').expect(200)).body,null);
});
