import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PrismaClient,Prisma} from '../prisma/client/index.js';
import {createApp} from '../server/app.js';
import {readConfig} from '../server/config.js';
const url=new URL(process.env.TEST_DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/invictus_test')throw Error('Solo invictus_test local');
const db=new PrismaClient({datasources:{db:{url:url.href}}}),origin='http://localhost:5177';
const app=await createApp({database:db,Prisma,config:readConfig({...process.env,DATABASE_URL:url.href,NODE_ENV:'test',STORAGE_DRIVER:'local',WEB_ORIGINS:origin,UPLOAD_DIRECTORY:'test-results/route-uploads'})});
const server=app.listen(3108);let vite,browser;
try{
 vite=await createServer({configFile:false,root:'client',plugins:[react()],server:{host:'localhost',port:5177,strictPort:true,proxy:{'/api':'http://localhost:3108'}}});await vite.listen();
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const headers={Origin:origin};expect((await page.request.post(origin+'/api/auth/register',{headers,data:{username:'ui_'+randomUUID().replaceAll('-','').slice(0,24),email:randomUUID()+'@example.test',password:'Invictus-Test-2026!'}})).status()).toBe(201);
 expect((await page.request.put(origin+'/api/profile',{headers,data:{name:'Ana',lastName:'Rutas',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'}})).status()).toBe(200);

 const created=await page.request.post(origin+'/api/events/mine',{headers,data:{title:'General UI '+randomUUID(),description:'Confraternidad',startsAt:'2027-10-01T13:00:00Z',venue:'Lima',competitionConfig:{genderEnabled:false,ageGroupsEnabled:false,ageGroups:[]}}});expect(created.status()).toBe(201);const event=await created.json();expect((await page.request.post(origin+'/api/events/mine/'+event.id+'/publish',{headers,data:{}})).status()).toBe(200);
 await page.goto(origin+'/eventos/'+event.publicSlug);await page.locator('.event-detail-actions .event-register').click();const modal=page.getByRole('dialog');await modal.getByLabel('Fecha de nacimiento',{exact:true}).fill('2000-01-01');const pending=page.waitForResponse(r=>r.url().endsWith('/api/events/'+event.id+'/register')&&r.request().method()==='POST');await modal.getByRole('button',{name:'Enviar inscripción',exact:true}).click();const r=await pending;expect(r.status()).toBe(201);const registration=await r.json();expect((await page.request.post(origin+'/api/registrations/'+registration.id+'/review',{headers,data:{version:registration.version,decision:'OBSERVED',note:'Confirma nacimiento'}})).status()).toBe(200);
 await page.goto(origin+'/inscripciones');await page.getByRole('button',{name:'Corregir inscripción',exact:true}).first().click();await expect(page.getByLabel('Fecha de nacimiento',{exact:true})).toHaveValue('2000-01-01');expect(errors).toEqual([]);console.log('Inscripción general autenticada: nacimiento, revisión y acceso a corrección aprobados.');
}finally{await browser?.close();await vite?.close();await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
