import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw new Error('Solo invictus_test local');
const db = new PrismaClient({
  datasources: {
    db: {
      url: url.href
    }
  }
});
const origin = 'http://localhost:5173';
const config = readConfig({
  ...process.env,
  DATABASE_URL: url.href,
  NODE_ENV: 'test',
  STORAGE_DRIVER: 'local',
  UPLOAD_DIRECTORY: '.local/test-uploads',
  WEB_ORIGINS: origin
});
const app = await createApp({
  database: db,
  Prisma,
  config
});
test.after(() => db.$disconnect());
const send = (agent, method, path, body = {}) => agent[method]('/api' + path).set('Origin', origin).send(body);
async function account() {
  const agent = request.agent(app);
  const result = await send(agent, 'post', '/auth/register', {
    name: 'Team',
    lastName: 'Prueba',
    email: `teams-${randomUUID()}@example.test`,
    password: 'Invictus-Test-2026!'
  }).expect(201);
  return {
    agent,
    user: result.body.user
  };
}
test('Ingreso: visibilidad, modalidades, aceptación, aislamiento y concurrencia', async () => {
  const owner = await account(),
    member = await account(),
    outsider = await account();
  const team = (await send(owner.agent, 'post', '/teams', {
    name: `Ingreso ${randomUUID()}`,
    phone: '999111222'
  }).expect(201)).body;
  assert.equal(team.joinPolicy, 'INVITE');
  assert.equal(team.discoverable, false);
  const path = `/teams/${team.id}`;
  assert.equal((await member.agent.get('/api/teams/explore?q=' + encodeURIComponent(team.name))).body.items.length, 0);
  await send(member.agent, 'post', path + '/join').expect(404);
  await send(owner.agent, 'patch', path, {
    discoverable: true,
    joinPolicy: 'APPROVAL'
  }).expect(200);
  const publicTeam = (await member.agent.get('/api/teams/explore?q=' + encodeURIComponent(team.name)).expect(200)).body.items[0];
  assert.equal(publicTeam.phone, undefined);
  assert.equal(publicTeam.email, undefined);
  const pending = (await send(member.agent, 'post', path + '/join').expect(200)).body;
  assert.equal(pending.status, 'PENDING');
  await member.agent.get('/api' + path).expect(404);
  await send(outsider.agent, 'post', path + '/admissions/' + pending.id, {
    accept: true
  }).expect(404);
  const requests = (await owner.agent.get('/api' + path + '/requests').expect(200)).body;
  assert.equal(requests.length, 1);
  await send(owner.agent, 'post', path + '/admissions/' + pending.id, {
    accept: true
  }).expect(200);
  assert.equal((await member.agent.get('/api' + path).expect(200)).body.role, 'MEMBER');
  await send(member.agent, 'patch', path, {
    joinPolicy: 'OPEN'
  }).expect(403);
  await member.agent.get('/api' + path + '/requests').expect(403);
  await send(member.agent, 'post', path + '/invitations', {
    email: outsider.user.email
  }).expect(403);
  await send(owner.agent, 'patch', path, {
    joinPolicy: 'INVITE'
  }).expect(200);
  await send(outsider.agent, 'post', path + '/join').expect(403);
  await send(owner.agent, 'post', path + '/invitations', {
    email: outsider.user.email
  }).expect(201);
  const invite = (await outsider.agent.get('/api/teams/invitations').expect(200)).body[0];
  await send(owner.agent, 'post', path + '/admissions/' + invite.id, {
    accept: true
  }).expect(404);
  await send(outsider.agent, 'post', path + '/admissions/' + invite.id, {
    accept: false
  }).expect(200);
  await outsider.agent.get('/api' + path).expect(404);
  await send(owner.agent, 'post', path + '/invitations', {
    email: outsider.user.email
  }).expect(201);
  await send(outsider.agent, 'post', path + '/admissions/' + invite.id, {
    accept: true
  }).expect(200);
  assert.equal((await outsider.agent.get('/api' + path).expect(200)).body.role, 'MEMBER');
  const open = (await send(owner.agent, 'post', '/teams', {
    name: 'Abierto',
    discoverable: true,
    joinPolicy: 'OPEN'
  }).expect(201)).body;
  const results = await Promise.all([send(member.agent, 'post', `/teams/${open.id}/join`), send(member.agent, 'post', `/teams/${open.id}/join`)]);
  assert.ok(results.every(r => r.status === 200));
  assert.equal(await db.teamMember.count({
    where: {
      teamId: open.id,
      userId: member.user.id
    }
  }), 1);
  assert.equal((await member.agent.get('/api/teams').expect(200)).body.items.length, 2);
  await db.team.update({
    where: {
      id: open.id
    },
    data: {
      active: false
    }
  });
  await send(outsider.agent, 'post', `/teams/${open.id}/join`).expect(404);
});
