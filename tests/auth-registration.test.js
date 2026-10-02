import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
const url = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/invictus_test') throw Error('Solo invictus_test local');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const origin = 'http://localhost:5173';
const app = await createApp({ database: db, Prisma, config: readConfig({ ...process.env, DATABASE_URL: url.href, NODE_ENV: 'test', STORAGE_DRIVER: 'local', WEB_ORIGINS: origin, UPLOAD_DIRECTORY: '.local/test-uploads' }) });
test.after(() => db.$disconnect());
const username = () => 'test_' + randomUUID().replaceAll('-','').slice(0,24);
const payload = () => ({ username: username(), email: randomUUID()+'@example.test', password: 'abcdefgh' });
const post = (agent, path, data) => agent.post('/api/auth/'+path).set('Origin', origin).send(data);

test('registro mínimo, normalización, sesión, login por correo y perfil posterior', async () => {
  const agent = request.agent(app), data = payload();
  const result = await post(agent, 'register', { ...data, username: ' '+data.username.toUpperCase()+' ', name: 'Ignorado', lastName: 'Ignorado' }).expect(201);
  assert.equal(result.body.user.username, data.username);
  assert.equal(result.body.user.name, ''); assert.equal(result.body.user.lastName, '');
  assert.ok(result.headers['set-cookie']); assert.equal(result.body.user.passwordHash, undefined);
  assert.equal(await db.participantProfile.count({ where: { userId: result.body.user.id } }), 0);
  const session = await agent.get('/api/auth/session').expect(200);
  assert.equal(session.body.user.username, data.username);
  await post(agent, 'logout', {}).expect(204);
  await agent.get('/api/auth/session').expect(401);
  await post(agent, 'login', {email:data.email,password:data.password}).expect(200);
  const profile = await agent.put('/api/profile').set('Origin',origin).send({ publicName:'Deportista', visibility:'PRIVATE' }).expect(200);
  assert.equal(profile.body.publicName,'Deportista');
  assert.equal((await agent.get('/api/profile').expect(200)).body.id,profile.body.id);
});
test('username y email duplicados, incluidos conflictos concurrentes', async () => {
  const data = payload(); await post(request(app),'register',data).expect(201);
  assert.equal((await post(request(app),'register',{...payload(),username:data.username.toUpperCase()}).expect(409)).body.error.code,'USERNAME_IN_USE');
  assert.equal((await post(request(app),'register',{...payload(),email:data.email.toUpperCase()}).expect(409)).body.error.code,'EMAIL_IN_USE');
  for (const key of ['username','email']) {
    const shared = payload()[key];
    const results = await Promise.all([1,2].map(() => post(request(app),'register',{...payload(),[key]:shared})));
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
    assert.equal(results.find(r=>r.status===409).body.error.code,key==='username'?'USERNAME_IN_USE':'EMAIL_IN_USE');
  }
});
test('validación de username y límites de contraseña', async () => {
  for(const invalid of [undefined,'ab','a'.repeat(31),'alan-burga','álan','alan burga'])
    await post(request(app),'register',{...payload(),username:invalid}).expect(400);
  for(const password of ['1234567','a'.repeat(129)]) await post(request(app),'register',{...payload(),password}).expect(400);
  await post(request(app),'register',{...payload(),password:'a'.repeat(128)}).expect(201);
});
test('disponibilidad anónima normalizada, validación y ausencia de caché',async()=>{
  const data=payload(), get=value=>request(app).get('/api/auth/username-availability').query({username:value});
  assert.deepEqual((await get(data.username).expect(200)).body,{available:true});
  await post(request(app),'register',data).expect(201);
  const taken=await get(' '+data.username.toUpperCase()+' ').expect(200);
  assert.deepEqual(taken.body,{available:false}); assert.equal(taken.headers['cache-control'],'no-store');
  await get('bad-name').expect(400); await request(app).get('/api/auth/username-availability').expect(400);
});
test('migración conserva cuentas existentes y funciona sin usuarios', async () => {
  const connection = new pg.Client({connectionString:url.href}); await connection.connect();
  const sql = await readFile(new URL('../prisma/migrations/20261001023_user_username/migration.sql',import.meta.url),'utf8');
  try {
    for(const populated of [false,true]) {
      await connection.query('BEGIN');
      await connection.query('CREATE TEMP TABLE users (id uuid PRIMARY KEY, name varchar(80) NOT NULL, last_name varchar(120) NOT NULL, email text, password_hash text)');
      if(populated) await connection.query("INSERT INTO users VALUES ($1,'Ana','Burga','ana@example.test','hash'),($2,'Ana','Burga','otra@example.test','hash2')",[randomUUID(),randomUUID()]);
      const before=(await connection.query('SELECT id,name,last_name,email,password_hash FROM users ORDER BY id')).rows;
      await connection.query(sql);
      const after=(await connection.query('SELECT id,name,last_name,email,password_hash FROM users ORDER BY id')).rows;
      assert.deepEqual(after,before);
      const rows=(await connection.query('SELECT username FROM users')).rows;
      assert.equal(new Set(rows.map(r=>r.username)).size,rows.length);
      assert.ok(rows.every(r=>/^[a-z0-9._]{3,30}$/.test(r.username)));
      await connection.query('ROLLBACK');
    }
  } finally { await connection.query('ROLLBACK'); await connection.end(); }
});
