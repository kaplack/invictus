import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
import { mapEventTeams } from '../server/teams/event-migration.js';

const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw new Error('Solo invictus_test local');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const origin = 'http://localhost:5173';
const app = await createApp({ database: db, Prisma, config: readConfig({ ...process.env, DATABASE_URL: url.href, NODE_ENV: 'test', STORAGE_DRIVER: 'local', WEB_ORIGINS: origin, UPLOAD_DIRECTORY: '.local/test-uploads' }) });
test.after(() => db.$disconnect());
const send = (a, method, path, body = {}) => a[method]('/api' + path).set('Origin', origin).send(body);
async function account(role = 'USER') {
  const agent = request.agent(app);
  const { body } = await send(agent, 'post', '/auth/register', { name: 'Eventos', lastName: 'Team', email: `${randomUUID()}@example.test`, password: 'Invictus-Test-2026!' }).expect(201);
  if (role !== 'USER') await db.user.update({ where: { id: body.user.id }, data: { role } });
  return { agent, user: body.user };
}

test('eventos por Team: gestión compartida, revocación, revisión, inscripción y migración compatible', async () => {
  const owner = await account(), coadmin = await account(), member = await account(), outsider = await account(), moderator = await account('ADMIN');
  const team = (await send(owner.agent, 'post', '/teams', { name: 'Team organizador' }).expect(201)).body;
  const another = (await send(outsider.agent, 'post', '/teams', { name: 'Team ajeno' }).expect(201)).body;
  const adminMembership = (await send(owner.agent, 'post', `/teams/${team.id}/members`, { email: coadmin.user.email, role: 'ADMIN' }).expect(201)).body;
  await send(owner.agent, 'post', `/teams/${team.id}/members`, { email: member.user.email }).expect(201);
  const input = { title: 'Natación Teams', description: 'Encuentro del Team', startsAt: '2027-09-01T14:00:00Z', timeZone: 'America/Lima', venue: 'Callao', maxCapacity: 5 };
  await send(owner.agent, 'post', '/events/mine', input).expect(400);
  await send(member.agent, 'post', '/events/mine', { ...input, teamId: team.id }).expect(403);
  await send(outsider.agent, 'post', '/events/mine', { ...input, teamId: team.id }).expect(404);
  await send(moderator.agent, 'post', '/events/manage', { ...input, teamId: team.id }).expect(404);
  const event = (await send(owner.agent, 'post', '/events/mine', { ...input, teamId: team.id }).expect(201)).body;
  assert.equal(event.createdByUserId, owner.user.id); assert.equal(event.teamId, team.id);
  await coadmin.agent.get(`/api/events/mine/${event.id}`).expect(200);
  await member.agent.get(`/api/events/mine/${event.id}`).expect(403);
  await send(coadmin.agent, 'patch', `/events/mine/${event.id}`, { ...input, venue: 'La Punta' }).expect(200);
  await send(coadmin.agent, 'patch', `/events/mine/${event.id}`, { ...input, teamId: another.id }).expect(409);
  await send(coadmin.agent, 'patch', `/events/mine/${event.id}`, { ...input, createdByUserId: coadmin.user.id }).expect(400);
  assert.ok((await coadmin.agent.get('/api/events/mine').expect(200)).body.some(e => e.id === event.id && e.team.name === team.name));
  assert.ok(!(await member.agent.get('/api/events/mine').expect(200)).body.some(e => e.id === event.id));
  await send(owner.agent, 'patch', `/teams/${team.id}/members/${adminMembership.id}`, { role: 'OWNER' }).expect(200);
  const ownerMembership = await db.teamMember.findUnique({ where: { teamId_userId: { teamId: team.id, userId: owner.user.id } } });
  await send(coadmin.agent, 'delete', `/teams/${team.id}/members/${ownerMembership.id}`).expect(204);
  await owner.agent.get(`/api/events/mine/${event.id}`).expect(404);
  await send(owner.agent, 'patch', `/events/mine/${event.id}`, input).expect(404);
  await send(owner.agent, 'post', `/events/mine/${event.id}/submit`).expect(404);
  await send(coadmin.agent, 'post', `/events/mine/${event.id}/submit`).expect(200);
  await moderator.agent.get(`/api/events/manage/${event.id}`).expect(200);
  await send(moderator.agent, 'post', `/events/manage/${event.id}/review`, { decision: 'APPROVE' }).expect(200);
  await moderator.agent.get(`/api/events/manage/${event.id}/attendees`).expect(404);
  const publicEvent = (await request(app).get(`/api/events/public/${event.publicSlug}`).expect(200)).body;
  assert.equal(publicEvent.team.name, team.name);
  const enrollment = (await send(owner.agent, 'post', `/events/${event.id}/register`).expect(201)).body;
  assert.equal(enrollment.status, 'CONFIRMED');
  assert.equal((await coadmin.agent.get(`/api/events/mine/${event.id}/attendees`).expect(200)).body.length, 1);
  await owner.agent.get(`/api/events/manage/${event.id}/attendees`).expect(404);

  // Historical fixture: no new API may create a Team-less event, but old rows stay usable.
  const legacy = await db.event.create({ data: { id: randomUUID(), organizerId: owner.user.id, publicSlug: 'legacy-' + randomUUID(), title: 'Histórico', description: 'Anterior a Teams', startsAt: new Date(input.startsAt), timeZone: input.timeZone, source: 'EXTERNAL', status: 'PUBLISHED', reviewStatus: 'APPROVED' } });
  await db.eventRegistrationConfig.create({ data: { eventId: legacy.id, amountCents: 0, currency: 'PEN', maxCapacity: 5 } });
  await owner.agent.get(`/api/events/mine/${legacy.id}`).expect(200);
  const oldRegistration = (await send(member.agent, 'post', `/events/${legacy.id}/register`).expect(201)).body;
  const mapping = [{ eventId: legacy.id, expectedOrganizerId: owner.user.id, teamId: team.id }];
  assert.equal((await mapEventTeams(db, mapping))[0].action, 'would_assign');
  assert.equal((await db.event.findUnique({ where: { id: legacy.id } })).teamId, null);
  await assert.rejects(mapEventTeams(db, [...mapping, { eventId: event.id, expectedOrganizerId: outsider.user.id, teamId: team.id }], { apply: true }));
  assert.equal((await db.event.findUnique({ where: { id: legacy.id } })).teamId, null);
  await mapEventTeams(db, mapping, { apply: true });
  assert.equal((await mapEventTeams(db, mapping, { apply: true }))[0].action, 'unchanged');
  const mapped = await db.event.findUnique({ where: { id: legacy.id } });
  assert.equal(mapped.publicSlug, legacy.publicSlug); assert.equal(mapped.status, legacy.status);
  assert.equal(mapped.createdByUserId, owner.user.id);
  assert.equal((await db.eventRegistration.findUnique({ where: { id: oldRegistration.id } })).status, 'CONFIRMED');
  await owner.agent.get(`/api/events/mine/${legacy.id}`).expect(404);
  await coadmin.agent.get(`/api/events/mine/${legacy.id}`).expect(200);
});
