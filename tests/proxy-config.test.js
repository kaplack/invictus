import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {rateLimit} from 'express-rate-limit';
import {readConfig} from '../server/config.js';

const env={DATABASE_URL:'postgresql://localhost/invictus',FILE_SIGNING_KEY:'x'.repeat(32)};

test('Proxy local desactivado, Render confía en un salto y respeta overrides',()=>{
 assert.equal(readConfig(env).TRUST_PROXY,0);
 assert.equal(readConfig({...env,RENDER:'true'}).TRUST_PROXY,1);
 for(const value of ['0','1','2'])assert.equal(readConfig({...env,RENDER:'true',TRUST_PROXY:value}).TRUST_PROXY,Number(value));
 assert.throws(()=>readConfig({...env,TRUST_PROXY:'true'}),/TRUST_PROXY/);
});

test('Cabeceras de proxy distinguen visitantes y mantienen el límite',async()=>{
 const app=express();app.set('trust proxy',readConfig({...env,RENDER:'true'}).TRUST_PROXY);
 const errors=[];const original=console.error;console.error=(...args)=>errors.push(args);
 try {
  app.get('/',rateLimit({windowMs:60000,limit:1}), (req,res)=>res.json({ip:req.ip}));
  const visit=ip=>request(app).get('/').set('Forwarded',`for=${ip};proto=https`).set('X-Forwarded-For',`192.0.2.99, ${ip}`);
  const first=await visit('198.51.100.1').expect(200);
  assert.equal(first.body.ip,'198.51.100.1');
  await visit('198.51.100.1').expect(429);
  await visit('198.51.100.2').expect(200);
  await request(app).get('/').set('Forwarded','for=192.0.2.100').set('X-Forwarded-For','192.0.2.100, 198.51.100.1').expect(429);
  assert.deepEqual(errors,[]);
 } finally {console.error=original;}
});
