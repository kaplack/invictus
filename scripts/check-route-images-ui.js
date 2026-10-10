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
 await page.goto(origin+'/mis-eventos/nuevo');await page.getByLabel('Nombre del evento',{exact:true}).fill('Galería '+randomUUID());await page.getByLabel('Descripción',{exact:true}).fill('Evento con dos recorridos');await page.getByLabel('Fecha del evento',{exact:true}).fill('2099-11-01');await page.getByLabel('Hora de salida',{exact:true}).fill('08:00');await page.getByLabel('Ubicación del evento',{exact:true}).fill('Lima');
 await page.locator('summary').filter({hasText:'Rutas del evento'}).click();expect(await page.locator('summary').innerText()).toBe('Rutas del evento');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64');
 for(const title of ['Nado · 3 km','Nado · 10 km']){await page.getByRole('button',{name:'Agregar imagen de ruta',exact:false}).click();const row=page.locator('.route-image-entry').last();await row.getByLabel('Título',{exact:true}).fill(title);await row.getByLabel('Descripción',{exact:true}).fill('Detalle de '+title);await row.locator('input[type=file]').setInputFiles({name:'ruta.png',mimeType:'image/png',buffer:png});}
 await page.getByRole('button',{name:'Subir imagen de ruta 2',exact:true}).click();expect(await page.getByLabel('Título',{exact:true}).first().inputValue()).toBe('Nado · 10 km');
 await mkdir('test-results/routes',{recursive:true});await page.screenshot({path:'test-results/routes/editor-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/routes/editor-mobile.png',fullPage:true});
 const savedResponse=page.waitForResponse(r=>r.url().endsWith('/api/events/mine')&&r.request().method()==='POST');await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();const response=await savedResponse;expect(response.status()).toBe(201);const event=await response.json();expect(event.routeImages.map(r=>r.title)).toEqual(['Nado · 10 km','Nado · 3 km']);
 await expect(page).toHaveURL(new RegExp(event.id));expect((await page.request.post(origin+'/api/events/mine/'+event.id+'/publish',{headers,data:{}})).status()).toBe(200);
 await page.goto(origin+'/eventos/'+event.publicSlug);await expect(page.getByRole('heading',{name:'Rutas del evento',exact:true})).toBeVisible();expect(await page.locator('.event-route-gallery figure').count()).toBe(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/routes/public-mobile.png',fullPage:true});expect(errors).toEqual([]);console.log('Galería UI: agregar, texto, upload, ordenar, guardar y publicación; escritorio/móvil aprobados.');
}finally{await browser?.close();await vite?.close();await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
