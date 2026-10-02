import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../prisma/client/index.js';
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
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#/acceso');await page.getByRole('button',{name:'Crear una cuenta',exact:true}).click();
  const field=page.getByLabel('Nombre de usuario'),submit=page.getByRole('button',{name:'Crear cuenta',exact:true});
  await expect(page.getByLabel('Apellidos')).toHaveCount(0);
  await expect(submit).toBeDisabled();await field.fill('ab');await expect(submit).toBeDisabled();
  const username='ui_'+randomUUID().replaceAll('-','').slice(0,24),email=randomUUID()+'@example.test';
  await page.route('**/username-availability?*',async route=>{
    const value=new URL(route.request().url()).searchParams.get('username');
    if(value==='taken_test')return route.fulfill({json:{available:false}});
    if(value==='offline_test')return route.abort();
    if(value==='slow_test'){await new Promise(r=>setTimeout(r,900));return route.fulfill({json:{available:false}});}
    return route.continue();
  });
  await field.fill('taken_test');await expect(page.getByText('Este nombre de usuario ya está en uso')).toBeVisible();await expect(submit).toBeDisabled();
  await field.fill('offline_test');await expect(page.getByRole('button',{name:'Volver a comprobar'})).toBeVisible();await expect(submit).toBeDisabled();
  const pending=page.waitForRequest('**/username-availability?username=slow_test');await field.fill('slow_test');await pending;
  await field.fill(username);await expect(submit).toBeDisabled();await expect(page.getByText('✓ @'+username+' está disponible')).toBeVisible();
  await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill('abcdefgh');
  await mkdir('.local/screenshots',{recursive:true});
  await page.screenshot({path:'.local/screenshots/signup-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/screenshots/signup-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(submit).toBeEnabled();await submit.click();await page.getByRole('heading',{name:'Perfil',exact:true}).waitFor();
  await expect(page.getByLabel('Nombre de usuario')).toHaveValue(username);
  expect(await db.participantProfile.count({where:{user:{email}}})).toBe(0);
  await page.getByRole('button',{name:'Cuenta: @'+username}).click();const loggedOut=page.waitForResponse(r=>r.url().endsWith('/api/auth/logout')&&r.status()===204);
  await page.getByRole('button',{name:'Cerrar sesión'}).click();await loggedOut;await expect(page.getByRole('button',{name:'Cuenta: @'+username})).toHaveCount(0);
  await page.goto(origin+'/#/acceso');await page.getByLabel('Correo electrónico').fill(email);await page.getByLabel('Contraseña',{exact:true}).fill('abcdefgh');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('heading',{name:'Perfil',exact:true}).waitFor();
  expect(errors).toEqual([]);console.log('Registro responsive, disponibilidad, error de red, respuesta obsoleta y login: OK');
} finally {await browser?.close();await vite?.close();await new Promise(resolve=>server.close(resolve));await db.$disconnect();}
