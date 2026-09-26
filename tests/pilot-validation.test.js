import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';

const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw new Error('Solo invictus_test local');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const origin = 'http://localhost:5173';
const app = await createApp({ database: db, Prisma, config: readConfig({ ...process.env, DATABASE_URL: url.href, NODE_ENV: 'test', STORAGE_DRIVER: 'local', WEB_ORIGINS: origin, UPLOAD_DIRECTORY: '.local/test-uploads' }) });
test.after(() => db.$disconnect());
const send = (a, method, path, body = {}) => a[method]('/api' + path).set('Origin',origin).send(body);
async function account(role = 'USER') {
  const agent = request.agent(app);
  const { body } = await send(agent,'post','/auth/register',{ name: 'Piloto', lastName: 'Validación', email: randomUUID()+'@example.test', password: 'Invictus-Test-2026!' }).expect(201);
  if (role !== 'USER') await db.user.update({ where: { id: body.user.id }, data: { role } });
  return { agent, user: body.user };
}
test('cierre mínimo: roles por Team, cupo global entre categorías, rechazo y precio inmutable', async () => {
  const a = await account('ADMIN'), b = await account(), c = await account();
  const teamA = (await send(a.agent,'post','/teams',{ name: 'Piloto A' }).expect(201)).body;
  const teamB = (await send(b.agent,'post','/teams',{ name: 'Piloto B' }).expect(201)).body;
  await send(a.agent,'post','/teams/'+teamA.id+'/members',{ email: b.user.email, role: 'MEMBER' }).expect(201);
  await send(b.agent,'post','/teams/'+teamB.id+'/members',{ email: a.user.email, role: 'MEMBER' }).expect(201);
  const discipline = (await request(app).get('/api/disciplines').expect(200)).body[0];
  const input = { title: 'Cupo compartido', description: 'Validación mínima', startsAt: '2027-09-01T14:00:00Z', timeZone: 'America/Lima', venue: 'Callao', maxCapacity: 1, disciplineId: discipline.id };
  const eventA = (await send(a.agent,'post','/events/manage',{ ...input,teamId: teamA.id }).expect(201)).body;
  const eventB = (await send(b.agent,'post','/events/mine',{ ...input,teamId: teamB.id }).expect(201)).body;
  const catInput = { name: 'General',priceCents: 0,capacity: 5 };
  await send(b.agent,'post','/events/'+eventB.id+'/categories',catInput).expect(201);
  await send(a.agent,'post','/events/'+eventB.id+'/categories',catInput).expect(403);
  await a.agent.get('/api/events/'+eventB.id+'/registrations').expect(403);
  await send(b.agent,'post','/events/'+eventA.id+'/categories',catInput).expect(403);
  const first = (await send(a.agent,'post','/events/'+eventA.id+'/categories',catInput).expect(201)).body;
  const second = (await send(a.agent,'post','/events/'+eventA.id+'/categories',{ ...catInput,name: 'Segunda' }).expect(201)).body;
  await send(a.agent,'post','/events/manage/'+eventA.id+'/publish').expect(200);
  const attempts = [
    { actor: b, input: { categoryId: first.id,participant: {} } },
    { actor: c, input: { categoryId: second.id,participant: {} } },
  ];
  const results = await Promise.all(attempts.map(x => send(x.actor.agent,'post','/events/'+eventA.id+'/register',x.input)));
  assert.deepEqual(results.map(r => r.status).sort(),[201,409]);
  const win = results.findIndex(r => r.status === 201), lose = 1-win;
  const registration = results[win].body;
  assert.equal(results[lose].body.error.code,'CAPACITY_REACHED');
  const summary = (await a.agent.get('/api/events/'+eventA.id+'/registrations').expect(200)).body;
  assert.equal(summary.summary.occupied,1);
  assert.equal(summary.categories.reduce((sum,x) => sum+x.occupied,0),1);
  // Being OWNER in B never authorizes review/list access in A.
  await b.agent.get('/api/events/'+eventA.id+'/registrations').expect(403);
  await send(b.agent,'post','/registrations/'+registration.id+'/review',{ version: registration.version,decision: 'CONFIRMED' }).expect(403);
  await send(a.agent,'post','/registrations/'+registration.id+'/review',{ version: registration.version,decision: 'REJECTED',note: 'Liberar cupo de prueba' }).expect(200);
  const admitted = (await send(attempts[lose].actor.agent,'post','/events/'+eventA.id+'/register',attempts[lose].input).expect(201)).body;
  assert.equal(admitted.status,'PENDING_REVIEW');
  await send(attempts[win].actor.agent,'post','/events/'+eventA.id+'/register',{ categoryId: attempts[lose].input.categoryId,participant: {} }).expect(409);
  // Return the official event to draft through its normal API: existing registrations still freeze category prices.
  await send(a.agent,'patch','/events/manage/'+eventA.id,{ ...input,status: 'DRAFT' }).expect(200);
  await send(a.agent,'put','/events/'+eventA.id+'/categories/'+admitted.categoryId,{ name: 'Precio cambiado',priceCents: 9900 }).expect(409);
  const preserved = await db.eventRegistration.findUnique({ where: { id: admitted.id } });
  assert.equal(preserved.amountCents,0);
  assert.equal(preserved.categorySnapshot.name,admitted.categorySnapshot.name);
});
