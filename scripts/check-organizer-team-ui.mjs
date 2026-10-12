import { chromium,expect } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir } from 'node:fs/promises';
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
 const account=await page.request.post(origin+'/api/auth/register',{headers:{Origin:origin},data:{username:'ui_'+randomUUID().replaceAll('-','').slice(0,24),email:randomUUID()+'@example.test',password:'abcdefgh'}});expect(account.status()).toBe(201);

 await page.goto(origin+'/#/perfil');await page.getByRole('heading',{name:'Perfil básico',exact:true}).waitFor();
 await page.getByLabel('Nombres',{exact:true}).fill('Ana');await page.getByLabel('Apellidos',{exact:true}).fill('Pérez');await page.getByLabel('DNI',{exact:true}).fill('12345678');await page.getByLabel('Teléfono',{exact:true}).fill('+51987654321');await page.getByLabel('Team (opcional)',{exact:true}).fill('COANF');
 await page.getByRole('button',{name:'Guardar perfil',exact:true}).click();await expect(page.getByText('Perfil guardado. Ya puedes crear tu evento.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Team (opcional)',{exact:true})).toHaveValue('COANF');
 await mkdir('.local/screenshots',{recursive:true});await page.screenshot({path:'.local/screenshots/organizer-team-profile-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'.local/screenshots/organizer-team-profile-mobile.png',fullPage:true});
 expect(errors).toEqual([]);console.log('Team guardado y recuperado; escritorio y móvil sin overflow ni errores.');
}finally{await browser?.close();await vite?.close();await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
