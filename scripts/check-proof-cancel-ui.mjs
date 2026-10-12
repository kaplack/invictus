import { chromium,expect } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir,writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PrismaClient,Prisma } from '../prisma/client/index.js';
import { createApp } from '../server/app.js';
import { readConfig } from '../server/config.js';
const url=new URL(process.env.TEST_DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/invictus_test')throw Error('Solo invictus_test local');
const db=new PrismaClient({datasources:{db:{url:url.href}}});
const origin='http://localhost:5174';
const app=await createApp({database:db,Prisma,config:readConfig({...process.env,DATABASE_URL:url.href,NODE_ENV:'test',STORAGE_DRIVER:'local',WEB_ORIGINS:origin,UPLOAD_DIRECTORY:'.local/test-uploads'})});
const server=app.listen(3101);let vite,browser;
try {
 vite=await createServer({configFile:false,root:'client',plugins:[react()],server:{host:'localhost',port:5174,strictPort:true,proxy:{'/api':'http://localhost:3101'}}});await vite.listen();
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));

 const call=async(path,data)=>{const response=await page.request.post(origin+'/api'+path,{headers:{Origin:origin},data});expect(response.ok()).toBe(true);return response.json();};
 const user=(await call('/auth/register',{username:'ui_'+randomUUID().replaceAll('-','').slice(0,24),email:randomUUID()+'@example.test',password:'abcdefgh'})).user;
 const profile=await page.request.put(origin+'/api/profile',{headers:{Origin:origin},data:{name:'Ana',lastName:'Organiza',documentType:'DNI',documentNumber:'12345678',phone:'+51999111222'}});expect(profile.ok()).toBe(true);
 const discipline=(await (await page.request.get(origin+'/api/disciplines')).json())[0];
 const event=await call('/events/mine',{title:'Invitados UI '+randomUUID().slice(0,6),description:'Inscripción sin cuenta',startsAt:'2027-10-02T14:00:00Z',timeZone:'America/Lima',venue:'Lima',maxCapacity:10,disciplineId:discipline.id});

 const category=await call('/events/'+event.id+'/categories',{name:'5K',priceCents:2500});
 const method=await call('/events/'+event.id+'/payment-methods',{type:'YAPE',label:'Yape',holderName:'Ana Organiza',phone:'999111222'});
 await call('/events/mine/'+event.id+'/publish',{});
 const context=await browser.newContext({viewport:{width:390,height:844}}),guest=await context.newPage();guest.on('pageerror',e=>errors.push(e.message));
 await guest.goto(origin+'/eventos/'+event.publicSlug);await guest.getByRole('button',{name:'Inscribirme',exact:true}).click();
 if(await guest.getByLabel('Categoría',{exact:true}).count())await guest.getByLabel('Categoría',{exact:true}).selectOption(category.id); await guest.getByLabel('Nombres',{exact:true}).fill('Luis');await guest.getByLabel('Apellidos',{exact:true}).fill('Invitado');await guest.getByLabel('Teléfono',{exact:true}).fill('999555666');await guest.getByLabel('Fecha de nacimiento',{exact:true}).fill('2000-01-01');await guest.getByLabel('Team',{exact:true}).fill('COANF');
 await guest.getByRole('combobox',{name:/Medio de pago/}).selectOption(method.id);
 const proof=guest.getByRole('dialog').locator('input[type=file]');
 await proof.dispatchEvent('cancel',{bubbles:true});
 await expect(guest.getByRole('dialog')).toBeVisible();
 for(const [label,value] of [['Nombres','Luis'],['Apellidos','Invitado'],['Team','COANF'],['Fecha de nacimiento','2000-01-01'],['Teléfono','999555666']])await expect(guest.getByLabel(label,{exact:true})).toHaveValue(value);
 await proof.setInputFiles({name:'comprobante.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')});
 await proof.dispatchEvent('cancel',{bubbles:true});await expect(guest.getByRole('dialog')).toBeVisible();expect(await proof.evaluate(input=>input.files[0].name)).toBe('comprobante.png');
 await mkdir('.local/screenshots',{recursive:true});expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await guest.screenshot({path:'.local/screenshots/proof-cancel-mobile.png',fullPage:true});
 await guest.setViewportSize({width:1440,height:1000});await guest.screenshot({path:'.local/screenshots/proof-cancel-desktop.png',fullPage:true});
 await proof.dispatchEvent('cancel',{bubbles:true});await expect(guest.getByLabel('Team',{exact:true})).toHaveValue('COANF');
 await guest.getByRole('button',{name:'Enviar inscripción',exact:true}).click();await expect(guest.getByText('Team: COANF',{exact:true})).toBeVisible();
 const rows=await (await page.request.get(origin+'/api/events/'+event.id+'/registrations')).json();const row=rows.items.find(r=>r.participantSnapshot?.teamName==='COANF');expect(row).toBeTruthy();
 await page.goto(origin+'/mis-eventos/'+event.id+'/inscripciones');await expect(page.getByRole('cell',{name:'COANF',exact:true})).toBeVisible();expect(errors).toEqual([]);await guest.goto(origin+'/eventos/'+event.publicSlug);await guest.getByRole('button',{name:'Inscribirme',exact:true}).click();await guest.getByRole('dialog').press('Escape');await expect(guest.getByRole('dialog')).toHaveCount(0);
 console.log('Cancelar archivo conserva modal, datos y comprobante anterior; envío aprobado; Escape del modal funciona.');
}finally{await browser?.close();await vite?.close();await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
