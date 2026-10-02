import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';

const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw new Error('Solo invictus_test local');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const origin = 'http://localhost:5173';
const config = readConfig({ ...process.env, DATABASE_URL: url.href, NODE_ENV: 'test', STORAGE_DRIVER: 'local', UPLOAD_DIRECTORY: '.local/test-uploads', WEB_ORIGINS: origin });
const app = await createApp({ database: db, Prisma, config });
test.after(() => db.$disconnect());
const send = (agent, method, path, body = {}) => agent[method]('/api' + path).set('Origin', origin).send(body);
async function account() {
  const agent = request.agent(app);
  const result = await send(agent, 'post', '/auth/register', { username: 'test_' + randomUUID().replaceAll('-', '').slice(0,24), email: `teams-${randomUUID()}@example.test`, password: 'Invictus-Test-2026!' }).expect(201);
  return { agent, user: result.body.user };
}


test('Directorio público: acceso anónimo, búsqueda y privacidad',async()=>{
 const owner=await account();
 const name=`Public-${randomUUID()}`;
 const team=(await send(owner.agent,'post','/teams',{name,description:'Comunidad deportiva',discoverable:true,phone:'999111222',email:'private@example.test'}).expect(201)).body;
 const hidden=(await send(owner.agent,'post','/teams',{name:name+' oculto'}).expect(201)).body;
 const result=(await request(app).get('/api/teams/public').query({q:name}).expect(200)).body;
 assert.equal(result.items.length,1);assert.equal(result.items[0].id,team.id);
 assert.deepEqual(Object.keys(result.items[0]).sort(),['id','name','description','logoFileId','bannerFileId','joinPolicy','disciplines','memberCount'].sort());
 await request(app).get('/api/teams/public/'+team.id).expect(200);
 await request(app).get('/api/teams/public/'+hidden.id).expect(404);
 await request(app).get('/api/teams/'+team.id).expect(401);
 await request(app).get('/api/teams/public?offset=-1').expect(400);
 await db.team.update({where:{id:team.id},data:{active:false}});
 await request(app).get('/api/teams/public/'+team.id).expect(404);
 assert.equal((await request(app).get('/api/teams/public').query({q:name}).expect(200)).body.items.length,0);
});
test('Banner: creación, reemplazo, retiro, propiedad, privacidad y límite de 10 MB', async () => {
  const owner = await account(), other = await account();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=', 'base64');
  async function upload(agent, bytes = png, visibility = 'public', type = 'image/png', name = 'banner.png') {
    return agent.post('/api/files').set('Origin', origin).set('Content-Type', type)
      .set('X-File-Visibility', visibility).set('X-File-Name', name).send(bytes);
  }
  const logo = (await upload(owner.agent)).body.file;
  const full = Buffer.alloc(10 * 1024 * 1024); png.copy(full);
  const uploaded = await upload(owner.agent, full);
  assert.equal(uploaded.status, 201);
  const banner = uploaded.body.file;
  const created = await send(owner.agent, 'post', '/teams', {name: 'Banner ' + randomUUID(), discoverable: true, logoFileId: logo.id, bannerFileId: banner.id}).expect(201);
  const team = created.body;
  assert.equal(team.bannerFileId, banner.id);
  assert.equal((await request(app).get('/api/teams/public/' + team.id).expect(200)).body.bannerFileId, banner.id);
  await send(owner.agent, 'delete', '/files/' + banner.id).expect(409);
  await send(other.agent, 'post', '/teams', {name: 'Ajeno', bannerFileId: banner.id}).expect(404);
  const privateFile = (await upload(owner.agent, png, 'private')).body.file;
  await send(owner.agent, 'patch', '/teams/' + team.id, {bannerFileId: privateFile.id}).expect(400);
  const textFile = (await upload(owner.agent, Buffer.from('texto'), 'public', 'text/plain', 'nota.txt')).body.file;
  await send(owner.agent, 'patch', '/teams/' + team.id, {bannerFileId: textFile.id}).expect(400);
  const tooLarge = await upload(owner.agent, Buffer.alloc(10 * 1024 * 1024 + 1));
  assert.equal(tooLarge.status, 413);
  for (const [type, name, bytes] of [
    ['image/jpeg', 'banner.jpg', Buffer.from([255, 216, 255, 217])],
    ['image/webp', 'banner.webp', Buffer.from('RIFF0000WEBP')],
  ]) {
    const replacement = (await upload(owner.agent, bytes, 'public', type, name)).body.file;
    const updated = (await send(owner.agent, 'patch', '/teams/' + team.id, {bannerFileId: replacement.id}).expect(200)).body;
    assert.equal(updated.bannerFileId, replacement.id);
    assert.equal(updated.logoFileId, logo.id);
  }
  const removed = (await send(owner.agent, 'patch', '/teams/' + team.id, {bannerFileId: null}).expect(200)).body;
  assert.equal(removed.bannerFileId, null);
  assert.equal(removed.logoFileId, logo.id);
  await send(owner.agent, 'delete', '/files/' + banner.id).expect(204);
});
test('Deportes y órdenes públicos: combinación, persistencia, conteo y paginación', async () => {
  const owner = await account(), member = await account();
  const sports = (await request(app).get('/api/disciplines').expect(200)).body;
  assert.ok(sports.length >= 2);
  const [swim, run] = sports;
  const prefix = 'Filters-' + randomUUID();
  async function create(suffix, ids) {
    return (await send(owner.agent, 'post', '/teams', {name: prefix + suffix, discoverable: true, disciplineIds: ids}).expect(201)).body;
  }
  const a = await create(' A', [swim.id, run.id]), b = await create(' B', [swim.id]), c = await create(' C', [run.id]);
  assert.equal(a.disciplines.length, 2);
  await db.team.update({where:{id:a.id},data:{createdAt:new Date('2026-01-01')}});
  await db.team.update({where:{id:b.id},data:{createdAt:new Date('2026-02-01')}});
  await db.team.update({where:{id:c.id},data:{createdAt:new Date('2026-03-01')}});
  await send(owner.agent, 'post', '/teams/' + b.id + '/members', {email: member.user.email, role:'MEMBER'}).expect(201);
  async function list(query = {}) {
    return (await request(app).get('/api/teams/public').query({q:prefix,...query}).expect(200)).body.items;
  }
  const ids = rows => rows.map(row => row.id);
  assert.deepEqual(ids(await list()), [a.id,b.id,c.id]);
  assert.deepEqual(ids(await list({sort:'name-desc'})), [c.id,b.id,a.id]);
  assert.deepEqual(ids(await list({sort:'recent'})), [c.id,b.id,a.id]);
  const byMembers = await list({sort:'members'});
  assert.deepEqual(ids(byMembers), [b.id,a.id,c.id]);
  assert.equal(byMembers[0].memberCount, 2);
  assert.equal('members' in byMembers[0], false);
  assert.deepEqual(ids(await list({disciplineId:swim.id,sort:'members'})), [b.id,a.id]);
  assert.deepEqual(ids(await list({disciplineId:swim.id,sort:'members',offset:1})), [a.id]);
  await send(member.agent, 'patch', '/teams/' + b.id, {disciplineIds:[run.id]}).expect(403);
  await send(owner.agent, 'patch', '/teams/' + a.id, {description:'Sin cambiar deportes'}).expect(200);
  assert.equal((await send(owner.agent, 'get', '/teams/' + a.id).expect(200)).body.disciplines.length, 2);
  await send(owner.agent, 'patch', '/teams/' + a.id, {disciplineIds:[run.id]}).expect(200);
  assert.deepEqual(ids(await list({disciplineId:swim.id})), [b.id]);
  await send(owner.agent, 'patch', '/teams/' + a.id, {disciplineIds:[]}).expect(200);
  assert.equal((await request(app).get('/api/teams/public/' + a.id).expect(200)).body.disciplines.length, 0);
  await send(owner.agent, 'patch', '/teams/' + a.id, {disciplineIds:[randomUUID()]}).expect(400);
  await request(app).get('/api/teams/public?sort=unknown').expect(400);
  await request(app).get('/api/teams/public?disciplineId=invalid').expect(400);
});
