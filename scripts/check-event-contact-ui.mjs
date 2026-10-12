import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {mkdir} from 'node:fs/promises';
const out=process.env.UI_SCREENSHOT_DIRECTORY||'.local/screenshots';await mkdir(out,{recursive:true});
const origin='http://localhost:5186';
const event={id:'event',title:'Nado Halloween',publicSlug:'nado-halloween',mode:'MANAGED',status:'PUBLISHED',startsAt:'2027-10-31T10:00:00Z',timeZone:'America/Lima',venue:'La Punta',description:'Nado en La Punta, Callao',organizerName:'Invictus',publicOrganizerPhone:'999777888',discipline:{name:'Natación'},categories:[{id:'category',name:'Master sin aletas',priceCents:10000,currency:'PEN'}]};
const vite=await createServer({configFile:false,root:'client',plugins:[react()],server:{host:'localhost',port:5186,strictPort:true}});let browser;
try{
 await vite.listen();browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/auth/session'?{user:null}:event}));
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(origin+'/eventos/nado-halloween');
  const bar=page.getByRole('complementary',{name:'Inscripción al evento'}),contact=bar.getByRole('link',{name:'Consultar al organizador',exact:true}),register=bar.getByRole('button',{name:'Inscribirme',exact:true});
  await expect(contact).toBeVisible();const link=new URL(await contact.getAttribute('href'));expect(link.pathname).toBe('/51999777888');expect(link.searchParams.get('text')).toBe('Hola, tengo una consulta sobre el evento Nado Halloween.');
  const rb=await register.boundingBox(),cb=await contact.boundingBox();
  if(width<900){
   const share=bar.getByRole('button',{name:'Compartir evento',exact:true}),sb=await share.boundingBox();
   expect(cb.width).toBe(44);expect(cb.height).toBe(44);expect(cb.x).toBeGreaterThanOrEqual(rb.x+rb.width);expect(sb.x).toBeGreaterThanOrEqual(cb.x+cb.width);expect(sb.x+sb.width).toBeLessThanOrEqual(width);
   expect(await bar.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
   await share.click();await expect(page.getByRole('dialog',{name:'Compartir evento'})).toBeVisible();await page.keyboard.press('Escape');
  }else{expect(cb.y).toBeGreaterThanOrEqual(rb.y+rb.height);await expect(contact.locator('span')).toBeVisible();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:out+'/event-whatsapp-'+width+'.png',fullPage:true});
 }
 event.publicOrganizerPhone=null;await page.reload();await expect(page.getByRole('link',{name:'Consultar al organizador',exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);console.log('Evento: WhatsApp y Compartir en barra fija a 320/390 px, contacto bajo inscripción a 1440 px; destino, mensaje, compartir y ausencia de contacto aprobados. API simulada.');
}finally{await browser?.close();await vite.close();}
