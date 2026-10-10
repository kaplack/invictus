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
const app = await createApp({ database: db, Prisma, config: readConfig({ ...process.env, DATABASE_URL: url.href, NODE_ENV: 'test', STORAGE_DRIVER: 'local', WEB_ORIGINS: origin, UPLOAD_DIRECTORY:process.env.EVENT_TEST_UPLOAD_DIRECTORY||'.local/test-uploads' }) });
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

test('invitados: privacidad, idempotencia, cupos, observación/corrección y confirmación sin cuentas ficticias',async()=>{
 const owner=await account(),outsider=await account();
 await send(owner.agent,'put','/profile',{name:'Ana',lastName:'Organiza',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'}).expect(200);
 const event=(await send(owner.agent,'post','/events/mine',{title:'Invitados '+randomUUID(),description:'Carrera con invitados',startsAt:'2027-09-01T14:00:00Z',timeZone:'America/Lima',venue:'Lima',maxCapacity:2}).expect(201)).body;
 const discipline=(await request(app).get('/api/disciplines').expect(200)).body[0];await send(owner.agent,'patch','/events/mine/'+event.id,{title:event.title,description:event.description,startsAt:event.startsAt,timeZone:event.timeZone,venue:event.venue,maxCapacity:2,disciplineId:discipline.id}).expect(200);
 const category=(await send(owner.agent,'post','/events/'+event.id+'/categories',{name:'5K',priceCents:2500,capacity:1}).expect(201)).body;
 const free=(await send(owner.agent,'post','/events/'+event.id+'/categories',{name:'Libre',priceCents:0}).expect(201)).body;
 const method=(await send(owner.agent,'post','/events/'+event.id+'/payment-methods',{type:'YAPE',label:'Yape',holderName:'Ana',phone:'999111222',qrFileId:await proof(owner)}).expect(201)).body;
 await send(owner.agent,'post','/events/mine/'+event.id+'/publish').expect(200);
 const usersBefore=await db.user.count(),profilesBefore=await db.participantProfile.count();
 const guest=request.agent(app),other=request.agent(app);
 await guest.get('/api/events/'+event.id+'/guest-registration-options').expect(200);
 await guest.get('/api/events/'+event.id+'/guest-payment-methods/'+method.id+'/qr').expect(200);
 const token=(await send(guest,'post','/events/'+event.id+'/guest-registration-token').expect(201)).body.token;
 const otherToken=(await send(other,'post','/events/'+event.id+'/guest-registration-token').expect(201)).body.token;
 const gsend=(t,path,body)=>request(app).post('/api'+path).set('Origin',origin).set('X-Registration-Token',t).send(body);
 const upload=async(t)=> (await request(app).post('/api/events/'+event.id+'/guest-proof').set('Origin',origin).set('X-Registration-Token',t).set('Content-Type','image/png').set('X-File-Name','proof.png').send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')).expect(201)).body.file.id;
 const person={name:'Luis',lastName:'Invitado',phone:'999555666',birthDate:'2000-01-01'};
 const path='/events/'+event.id+'/guest-registrations';
 const input={categoryId:category.id,methodId:method.id,participant:person};
 await gsend(token,path,input).expect(400);
 const ownFile=await upload(token),foreignFile=await upload(otherToken);
 await request(app).get('/api/files/'+ownFile+'/public').expect(404);
 await gsend(token,path,{...input,proofFileId:foreignFile}).expect(400);
 await gsend(token,path,{...input,proofFileId:await proof(outsider)}).expect(400);
 await gsend(token,path,{...input,proofFileId:ownFile,participant:{...person,phone:''}}).expect(400);
 await gsend(token,path,{...input,proofFileId:ownFile,amountCents:1}).expect(400);
 let r=(await gsend(token,path,{...input,proofFileId:ownFile}).expect(201)).body;
 assert.equal(r.status,'PENDING_REVIEW');
 assert.equal((await gsend(token,path,{...input,proofFileId:ownFile}).expect(201)).body.id,r.id);
 const row=await db.eventRegistration.findUnique({where:{id:r.id}});assert.equal(row.userId,null);assert.equal(row.profileId,null);assert.equal(row.amountCents,2500);assert.ok(row.guestAccessHash);assert.notEqual(row.guestAccessHash,token);
 assert.equal((await db.paymentOperation.findUnique({where:{id:r.id}})).payerId,null);
 await gsend(otherToken,path,{...input,proofFileId:foreignFile}).expect(409);
 const get=()=>request(app).get('/api/guest-registration').set('X-Registration-Token',token);
 let detail=(await get().expect(200)).body;
 await request(app).get('/api/guest-registration').expect(404);
 await request(app).get('/api/guest-registration').set('X-Registration-Token',otherToken).expect(404);
 await request(app).get('/api/guest-registration').set('X-Registration-Token',token.slice(0,-1)+'z').expect(404);
 await outsider.agent.get('/api/registrations/'+r.id).expect(403);
 const paymentId=detail.payments[0].id;
 await request(app).get('/api/guest-registration/payments/'+paymentId+'/proof').set('X-Registration-Token',token).expect(200);
 await request(app).get('/api/guest-registration/payments/'+paymentId+'/proof').set('X-Registration-Token',otherToken).expect(404);
 await owner.agent.get('/api/registrations/'+r.id+'/payments/'+paymentId+'/proof').expect(200);
 await outsider.agent.get('/api/registrations/'+r.id+'/payments/'+paymentId+'/proof').expect(403);
 const list=(await owner.agent.get('/api/events/'+event.id+'/registrations?q=Luis').expect(200)).body;assert.ok(list.items.some(x=>x.id===r.id));
 r=(await send(owner.agent,'post','/registrations/'+r.id+'/review',{version:detail.version,decision:'OBSERVED',note:'Comprobante más legible'}).expect(200)).body;
 const corrected={version:r.version,participant:{...person,phone:'999555777'},proofFileId:await upload(token)};
 await gsend(token,'/guest-registration/resubmit',{...corrected,version:r.version-1}).expect(409);
 await gsend(token,'/guest-registration/resubmit',corrected).expect(200);
 detail=(await get().expect(200)).body;assert.equal(detail.payments.length,2);assert.equal(detail.participantSnapshot.phone,'999555777');
 await send(owner.agent,'post','/registrations/'+r.id+'/review',{version:detail.version,decision:'CONFIRMED'}).expect(200);
 detail=(await get().expect(200)).body;assert.equal(detail.status,'CONFIRMED');
 const freeR=(await gsend(otherToken,path,{categoryId:free.id,participant:{...person,name:'Marta'}}).expect(201)).body;
 await send(owner.agent,'post','/registrations/'+freeR.id+'/review',{version:2,decision:'CONFIRMED'}).expect(200);
 assert.equal(await db.user.count(),usersBefore);assert.equal(await db.participantProfile.count(),profilesBefore);
 assert.equal(await db.registrationAudit.count({where:{registrationId:r.id,actorId:null}}),2);
});

test('invitado: evento gratuito sin categorías permite revisión en consola',async()=>{
 const owner=await account();await send(owner.agent,'put','/profile',{name:'Ana',lastName:'Organiza',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'}).expect(200);
 const event=(await send(owner.agent,'post','/events/mine',{title:'Gratis '+randomUUID(),description:'Evento gratuito',startsAt:'2027-09-01T14:00:00Z',timeZone:'America/Lima',venue:'Lima',maxCapacity:1}).expect(201)).body;
 await send(owner.agent,'post','/events/mine/'+event.id+'/publish').expect(200);
 const token=(await send(request(app),'post','/events/'+event.id+'/guest-registration-token').expect(201)).body.token;
 const r=(await request(app).post('/api/events/'+event.id+'/guest-registrations').set('Origin',origin).set('X-Registration-Token',token).send({participant:{name:'Luis',lastName:'Gratis',phone:'999555666',birthDate:'2000-01-01'}}).expect(201)).body;
 await owner.agent.get('/api/registrations/'+r.id).expect(200);
 await send(owner.agent,'post','/registrations/'+r.id+'/review',{version:2,decision:'CONFIRMED'}).expect(200);
 assert.equal((await request(app).get('/api/guest-registration').set('X-Registration-Token',token).expect(200)).body.status,'CONFIRMED');
});
