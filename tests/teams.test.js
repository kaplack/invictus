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
  const result = await send(agent, 'post', '/auth/register', { name: 'Team', lastName: 'Prueba', email: `teams-${randomUUID()}@example.test`, password: 'Invictus-Test-2026!' }).expect(201);
  return { agent, user: result.body.user };
}

test('Teams: sesiones reales, roles locales, aislamiento, logos y último propietario concurrente', async () => {
  const owner = await account(), admin = await account(), member = await account(), outsider = await account();
  await request(app).get('/api/teams').expect(401);
  await send(owner.agent, 'post', '/teams', { name: 'No', role: 'ADMIN' }).expect(400);
  await send(owner.agent, 'post', '/teams', { name: '   ' }).expect(400);
  const team = (await send(owner.agent, 'post', '/teams', { name: 'Team piloto', description: 'Prueba real' }).expect(201)).body;
  assert.equal(team.role, 'OWNER');
  assert.equal((await owner.agent.get('/api/auth/session').expect(200)).body.user.role, 'USER');
  await owner.agent.get('/api/admin/users').expect(403);
  await outsider.agent.get(`/api/teams/${team.id}`).expect(404);
  await send(outsider.agent, 'patch', `/teams/${team.id}`, { name: 'Ajeno' }).expect(404);
  const base = `/teams/${team.id}/members`;
  const a = (await send(owner.agent, 'post', base, { email: admin.user.email.toUpperCase(), role: 'ADMIN' }).expect(201)).body;
  const m = (await send(owner.agent, 'post', base, { email: member.user.email }).expect(201)).body;
  assert.equal(m.role, 'MEMBER');
  assert.equal(m.user.email, undefined);
  assert.equal(m.user.passwordHash, undefined);
  await send(owner.agent, 'post', base, { email: member.user.email }).expect(409);
  await send(admin.agent, 'patch', `/teams/${team.id}`, { description: 'Actualizado por admin local' }).expect(200);
  await send(member.agent, 'patch', `/teams/${team.id}`, { name: 'No' }).expect(403);
  await send(admin.agent, 'post', base, { email: outsider.user.email }).expect(403);
  await send(member.agent, 'delete', `${base}/${m.id}`).expect(403);
  const members = (await owner.agent.get('/api' + base).expect(200)).body.items;
  const firstOwner = members.find(row => row.userId === owner.user.id);
  await send(owner.agent, 'delete', `${base}/${firstOwner.id}`).expect(409);
  await send(owner.agent, 'patch', `${base}/${firstOwner.id}`, { role: 'MEMBER' }).expect(409);
  await send(admin.agent, 'patch', `${base}/${firstOwner.id}`, { role: 'MEMBER' }).expect(403);
  const secondTeam = (await send(outsider.agent, 'post', '/teams', { name: 'Otro Team' }).expect(201)).body;
  await send(owner.agent, 'delete', `/teams/${secondTeam.id}/members/${m.id}`).expect(404);
  await send(outsider.agent, 'delete', `/teams/${secondTeam.id}/members/${m.id}`).expect(404);
  assert.equal((await member.agent.get('/api/teams').expect(200)).body.items.length, 1);
  await owner.agent.get('/api/teams?offset=-1').expect(400);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const upload = async visibility => (await owner.agent.post('/api/files').set('Origin', origin).set('Content-Type', 'image/png').set('X-File-Name', 'logo.png').set('X-File-Visibility', visibility).send(png).expect(201)).body.file;
  const publicLogo = await upload('public'), privateLogo = await upload('private');
  await send(owner.agent, 'patch', `/teams/${team.id}`, { logoFileId: privateLogo.id }).expect(400);
  await send(owner.agent, 'patch', `/teams/${team.id}`, { logoFileId: publicLogo.id }).expect(200);
  await send(admin.agent, 'patch', `/teams/${team.id}`, { logoFileId: publicLogo.id, name: 'Logo compartido' }).expect(200);
  await send(outsider.agent, 'patch', `/teams/${secondTeam.id}`, { logoFileId: publicLogo.id }).expect(404);
  await send(owner.agent, 'delete', `${base}/${m.id}`).expect(204);
  await member.agent.get('/api' + base).expect(404);
  await send(owner.agent, 'patch', `${base}/${a.id}`, { role: 'OWNER' }).expect(200);
  const concurrent = await Promise.all([
    send(owner.agent, 'delete', `${base}/${firstOwner.id}`),
    send(admin.agent, 'patch', `${base}/${a.id}`, { role: 'MEMBER' }),
  ]);
  assert.equal(concurrent.filter(r => r.status === 409).length, 1);
  assert.equal(concurrent.filter(r => [200, 204].includes(r.status)).length, 1);
  assert.equal(await db.teamMember.count({ where: { teamId: team.id, role: 'OWNER' } }), 1);
});
