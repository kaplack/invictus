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
 const prefix='Home '+randomUUID().slice(0,6),startsAt=new Date(Date.now()+172800000).toISOString();
 const event=await call('/events/mine',{title:prefix+' Carrera',description:'Evento del MVP',startsAt,timeZone:'America/Lima',venue:'Chorríllos',maxCapacity:10,disciplineId:discipline.id});
 await call('/events/'+event.id+'/categories',{name:'5K',priceCents:2500});await call('/events/'+event.id+'/payment-methods',{type:'YAPE',label:'Yape',holderName:'Ana',phone:'999111222'});await call('/events/mine/'+event.id+'/publish',{});
 await db.user.update({where:{id:user.id},data:{role:'ADMIN'}});
 const info=await call('/events/manage',{mode:'INFORMATIONAL',title:prefix+' Informativo',description:'Evento informativo',startsAt,timeZone:'America/Lima',venue:'Tacna',publicOrganizerName:'Academia externa',externalUrl:'https://example.org/evento'});await call('/events/manage/'+info.id+'/publish',{});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),publicPage=await context.newPage();publicPage.on('pageerror',e=>errors.push(e.message));await publicPage.goto(origin+'/');
 await expect(publicPage.locator('.event-card').first()).toBeVisible();expect(await publicPage.getByRole('link',{name:'Teams',exact:true}).count()).toBe(0);expect(await publicPage.getByRole('link',{name:'Tienda',exact:true}).count()).toBe(0);expect(await publicPage.locator('.cart-link').count()).toBe(0);
 await publicPage.getByLabel('Buscar eventos',{exact:true}).fill(prefix);await expect(publicPage.locator('.event-card')).toHaveCount(2);await expect(publicPage.locator('.event-card').filter({hasText:'Carrera'})).toContainText(discipline.name);await expect(publicPage.locator('.event-card').filter({hasText:'Carrera'})).toContainText('25.00');await expect(publicPage.locator('.event-card').filter({hasText:'Informativo'})).toContainText('Más información');
 await mkdir('.local/screenshots',{recursive:true});await publicPage.screenshot({path:'.local/screenshots/events-home-desktop.png',fullPage:true});
 for(const viewport of [{width:390,height:844},{width:320,height:568}]){await publicPage.setViewportSize(viewport);const hero=await publicPage.locator('.events-home-hero').boundingBox(),first=await publicPage.locator('.event-card').first().boundingBox();expect(hero.height).toBeLessThanOrEqual(viewport.height*.40+1);expect(first.y).toBeLessThan(viewport.height);expect(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await publicPage.screenshot({path:'.local/screenshots/events-home-'+viewport.width+'.png',fullPage:true});console.log('Home '+viewport.width+' px: hero '+hero.height.toFixed(0)+' px, primera card visible');}
 await publicPage.getByLabel('Buscar eventos',{exact:true}).fill('sinresultados-'+randomUUID());await expect(publicPage.getByText('No encontramos eventos con esa búsqueda.',{exact:true})).toBeVisible();await publicPage.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();await expect(publicPage.locator('.event-card').first()).toBeVisible();
 await publicPage.getByLabel('Buscar eventos',{exact:true}).fill('chorrillos');await expect(publicPage.locator('.event-card').filter({hasText:event.title})).toBeVisible();
 await publicPage.getByRole('link',{name:/Crear evento/}).first().click();await expect(publicPage.locator('.invictus-auth')).toBeVisible();
 await publicPage.setViewportSize({width:1440,height:1000});
 await publicPage.getByLabel('Correo electrónico').fill(user.email);await publicPage.getByLabel('Contraseña',{exact:true}).fill('abcdefgh');await publicPage.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect(publicPage.getByRole('heading',{name:'Crear evento',exact:true})).toBeVisible();expect(new URL(publicPage.url()).hash).toBe('');
 await publicPage.getByRole('link',{name:'← Mis eventos',exact:true}).click();
 await page.goto(origin+'/mis-eventos');await page.reload();
 expect(await page.locator('.main-navigation').getByRole('link',{name:'Mis eventos',exact:true}).count()).toBe(0);
 const row=page.locator('.records tr').filter({hasText:event.title});await expect(row.getByRole('button',{name:'Editar',exact:true})).toBeVisible();await row.getByRole('button',{name:'Editar',exact:true}).focus();await expect(row.getByRole('tooltip')).toHaveText('Editar');await page.keyboard.press('Escape');await expect(row.getByRole('tooltip')).toHaveCount(0);
 await row.getByRole('link',{name:'Ver evento',exact:true}).click();await expect(page.getByRole('heading',{name:event.title,exact:true})).toBeVisible();expect(new URL(page.url()).hash).toBe('');await page.reload();await expect(page.getByRole('heading',{name:event.title,exact:true})).toBeVisible();await page.goBack();await expect(page.getByRole('heading',{name:'Mis eventos',exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/screenshots/event-actions-390.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'.local/screenshots/event-actions-1440.png',fullPage:true});
 await page.goto(origin+'/#/eventos');await expect(page.getByRole('heading',{name:'Próximos eventos',exact:true})).toBeVisible();expect(new URL(page.url()).pathname).toBe('/');expect(new URL(page.url()).hash).toBe('');
 expect(await page.getByRole('link',{name:/Ver todos/}).count()).toBe(0);expect(await page.locator('.events-home-hero input').count()).toBe(0);await expect(page.locator('.events-home-list input')).toBeVisible();
 await page.goto(origin+'/');await page.getByRole('button',{name:/Cuenta:/}).click();await expect(page.locator('.user-menu-panel').getByRole('link',{name:'Mis eventos',exact:true})).toBeVisible();expect(await page.locator('.user-menu-panel').getByRole('link',{name:'Teams',exact:true}).count()).toBe(0);expect(await page.locator('.user-menu-panel').getByRole('link',{name:'Pedidos',exact:true}).count()).toBe(0);
 const beginner=await browser.newContext(),beginnerPage=await beginner.newPage();beginnerPage.on('pageerror',e=>errors.push(e.message));
 const newcomer=await beginnerPage.request.post(origin+'/api/auth/register',{headers:{Origin:origin},data:{username:'ui_'+randomUUID().replaceAll('-','').slice(0,24),email:randomUUID()+'@example.test',password:'abcdefgh'}});expect(newcomer.ok()).toBe(true);
 await beginnerPage.goto(origin+'/mis-eventos?crear=1');await expect(beginnerPage.getByRole('heading',{name:'Perfil básico',exact:true})).toBeVisible();
 await beginnerPage.getByLabel('Nombres',{exact:true}).fill('Luis');await beginnerPage.getByLabel('Apellidos',{exact:true}).fill('Prueba');await beginnerPage.getByLabel('DNI',{exact:true}).fill('87654321');await beginnerPage.getByLabel('Teléfono',{exact:true}).fill('+51999222333');await beginnerPage.getByRole('button',{name:'Guardar perfil',exact:true}).click();await expect(beginnerPage.getByRole('heading',{name:'Crear evento',exact:true})).toBeVisible();expect(new URL(beginnerPage.url()).hash).toBe('');await beginner.close();
 await page.goto(origin+'/#/mis-teams');await expect(page.getByText('Esta sección todavía no está disponible.',{exact:false})).toBeVisible();
 expect(errors).toEqual([]);console.log('Home, búsqueda, eventos gestionados/informativos, precios y navegación MVP aprobados; sin nueva suite de backend.');
}finally{await browser?.close();await vite?.close();await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
