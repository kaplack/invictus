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
  const { body } = await send(agent,'post','/auth/register',{ username: 'test_' + randomUUID().replaceAll('-', '').slice(0,24), email: `${randomUUID()}@example.test`, password: 'Invictus-Test-2026!' }).expect(201);
  if (role !== 'USER') await db.user.update({ where: { id: body.user.id }, data: { role } });
  return { agent, user: body.user };
}
async function proof(actor, visibility = 'private') {
  return (await actor.agent.post('/api/files').set('Origin',origin).set('Content-Type','image/png').set('X-File-Name','proof.png').set('X-File-Visibility',visibility)
    .send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')).expect(201)).body.file.id;
}

test('Profile es fuente de nombres en sesión, inscripción y respuestas existentes; User conserva solo datos históricos',async()=>{
 const owner=await account(),participant=await account();
 await db.user.update({where:{id:owner.user.id},data:{name:'Nombre histórico',lastName:'Apellido histórico'}});
 assert.equal((await owner.agent.get('/api/auth/session').expect(200)).body.user.name,'Nombre histórico');
 const basic={name:'Ana',lastName:'Organiza',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'};
 await send(owner.agent,'put','/profile',basic).expect(200);
 const stored=await db.user.findUnique({where:{id:owner.user.id}});assert.equal(stored.name,'Nombre histórico');assert.equal(stored.lastName,'Apellido histórico');assert.equal(stored.role,'USER');
 const identity=(await owner.agent.get('/api/auth/session').expect(200)).body.user;assert.equal(identity.name,'Ana');assert.equal(identity.lastName,'Organiza');
 for(const key of ['passwordHash','profileUserRows','documentNumber','phone'])assert.equal(Object.hasOwn(identity,key),false,key);
 await send(owner.agent,'put','/profile',{name:null,lastName:null}).expect(200);
 const empty=(await owner.agent.get('/api/auth/session').expect(200)).body.user;assert.equal(empty.name,'');assert.equal(empty.lastName,'');
 await send(owner.agent,'put','/profile',{username:owner.user.username}).expect(200);
 assert.equal((await owner.agent.get('/api/profile').expect(200)).body.name,null);
 await send(owner.agent,'put','/profile',basic).expect(200);
 const credentials={email:owner.user.email,password:'Invictus-Test-2026!'};
 await send(owner.agent,'post','/auth/logout').expect(204);await owner.agent.get('/api/auth/session').expect(401);
 assert.equal((await send(owner.agent,'post','/auth/login',credentials).expect(200)).body.user.name,'Ana');
 const discipline=(await request(app).get('/api/disciplines').expect(200)).body[0];
 const event=(await send(owner.agent,'post','/events/mine',{title:'Identidad '+randomUUID(),description:'Prueba de fuente de identidad',startsAt:'2027-09-01T14:00:00Z',timeZone:'America/Lima',venue:'Lima',maxCapacity:10,disciplineId:discipline.id}).expect(201)).body;
 const category=(await send(owner.agent,'post','/events/'+event.id+'/categories',{name:'Libre',priceCents:0}).expect(201)).body;
 await send(owner.agent,'post','/events/mine/'+event.id+'/publish').expect(200);
 await db.user.update({where:{id:participant.user.id},data:{name:'Dato viejo',lastName:'Sin actualizar'}});
 await send(participant.agent,'put','/profile',{name:'Luis',lastName:'Participa',phone:'+51999555666'}).expect(200);
 const r=(await send(participant.agent,'post','/events/'+event.id+'/register',{categoryId:category.id,participant:{phone:'999555666'}}).expect(201)).body;
 const frozen=await db.eventRegistration.findUnique({where:{id:r.id}});assert.equal(frozen.participantSnapshot.name,'Luis');assert.equal(frozen.participantSnapshot.lastName,'Participa');
 await send(participant.agent,'put','/profile',{name:'Luis nuevo',lastName:'Actualizado'}).expect(200);
 const detail=(await owner.agent.get('/api/registrations/'+r.id).expect(200)).body;assert.equal(detail.user.name,'Luis nuevo');assert.equal(detail.participantSnapshot.name,'Luis');assert.equal(detail.audits[0].actor.name,'Luis nuevo');
 assert.equal(Object.hasOwn(detail.user,'profileUserRows'),false);assert.equal(Object.hasOwn(detail.audits[0].actor,'profileUserRows'),false);
 const snapshotAfter=(await db.eventRegistration.findUnique({where:{id:r.id}})).participantSnapshot;assert.deepEqual(snapshotAfter,frozen.participantSnapshot);
 const listed=(await owner.agent.get('/api/events/'+event.id+'/registrations?q=Actualizado').expect(200)).body;assert.equal(listed.items[0].user.lastName,'Actualizado');
 assert.equal((await owner.agent.get('/api/events/'+event.id+'/registrations?q=Dato%20viejo').expect(200)).body.total,0);
 const historical=(await owner.agent.get('/api/events/mine/'+event.id+'/attendees').expect(200)).body;assert.equal(historical[0].participant.name,'Luis');
 // Two identity responses from the dormant Teams module, without testing its unrelated workflows.
 const team=(await send(owner.agent,'post','/teams',{name:'Compatibilidad identidad'}).expect(201)).body;
 const added=(await send(owner.agent,'post','/teams/'+team.id+'/members',{email:participant.user.email}).expect(201)).body;assert.equal(added.user.name,'Luis nuevo');assert.equal(Object.hasOwn(added.user,'email'),false);assert.equal(Object.hasOwn(added.user,'profileUserRows'),false);
 const members=(await owner.agent.get('/api/teams/'+team.id+'/members').expect(200)).body;assert.equal(members.items.find(row=>row.userId===owner.user.id).user.name,'Ana');
 await db.user.update({where:{id:owner.user.id},data:{role:'ADMIN'}});
 const users=(await owner.agent.get('/api/admin/users').expect(200)).body;assert.equal(users.find(user=>user.id===participant.user.id).name,'Luis nuevo');
 assert.equal((await db.user.findUnique({where:{id:participant.user.id}})).name,'Dato viejo');
});
