import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const origin='http://localhost:5187';
const vite=await createServer({configFile:false,root:'client',plugins:[react()],server:{host:'localhost',port:5187,strictPort:true}});let browser;
try{
 await vite.listen();browser=await chromium.launch({channel:'msedge',headless:true});
 for(const value of ['+51999111222','999777888','']){
  const page=await browser.newPage({viewport:{width:390,height:844}});let saved=null,sent=false;
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   let data={};
   if(path==='/api/auth/session')data={user:{id:'owner',username:'owner',role:'USER'}};
   else if(path==='/api/profile')data={phone:'+51999111222'};
   else if(path==='/api/disciplines')data=[];
   else if(path==='/api/events/mine'&&route.request().method()==='POST'){
    saved={...route.request().postDataJSON(),id:'saved',status:'DRAFT',publicSlug:'saved'};sent=true;data=saved;
   }else if(path==='/api/events/mine/saved')data=saved;
   else if(path==='/api/events/saved/setup')data={editable:true,hasRegistrations:false,categories:[],methods:[],methodIds:[]};
   await route.fulfill({json:data});
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin+'/mis-eventos/nuevo');const field=page.getByLabel('WhatsApp del organizador (opcional)',{exact:true});
  await expect(field).toHaveValue('+51999111222');await expect(page.getByText('Este número será público para consultas del evento. Puedes cambiarlo o borrarlo.',{exact:true})).toBeVisible();
  await field.fill(value);await page.getByLabel('Nombre del evento',{exact:true}).fill('Evento prueba');await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();
  await expect.poll(()=>sent).toBe(true);expect(saved.publicOrganizerPhone).toBe(value||null);
  await expect(page).toHaveURL(/\/mis-eventos\/saved\/editar/);await expect(field).toHaveValue(value);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.close();
 }
 console.log('WhatsApp del perfil: prellenado, reemplazo, borrado y persistencia al editar aprobados a 390 px. API simulada.');
}finally{await browser?.close();await vite.close();}
