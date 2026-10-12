import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const origin='http://localhost:5185';
const out=process.env.UI_SCREENSHOT_DIRECTORY||'.local/screenshots';
await mkdir(out,{recursive:true});
const fixture={registrationCode:'INV-AH7B-4GC8-6E2F-9D3A',status:'PENDING_REVIEW',version:1,event:{title:'Nado Halloween',publicSlug:'nado-halloween'},participantSnapshot:{name:'Michael',lastName:'Herencia',phone:'987951963',teamName:'Tiburoncines'},categorySnapshot:{name:'Master sin aletas'},amountCents:10000,currency:'PEN',payments:[{id:'proof',proofFileId:'file'}],paymentInstructionsSnapshot:{type:'YAPE',label:'Yape',holder:'Alan Burga',phone:'980784509'}};
const vite=await createServer({configFile:false,root:'client',plugins:[react()],server:{host:'localhost',port:5185,strictPort:true}});
let browser;
try{
 await vite.listen();browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let data=path==='/api/auth/session'?{user:null}:path==='/api/events'?[]:path==='/api/guest-registration'?fixture:{};
  if(path==='/api/registration-status'){
   const code=route.request().postDataJSON().code;
   if(code!==fixture.registrationCode)return route.fulfill({status:404,json:{error:{message:'No encontramos esa inscripción. Revisa el código.'}}});
   data={code,competitorNumber:fixture.competitorNumber??null,status:fixture.status,event:fixture.event,categorySnapshot:fixture.categorySnapshot};
  }
  await route.fulfill({json:data});
 });
 await page.goto(origin+'/inscripcion/test-token');
 await expect(page.getByText(fixture.registrationCode,{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Copiar código',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Copiar código',exact:true}).click();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(fixture.registrationCode);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('.landing-shell').count()).toBe(1);
 await page.screenshot({path:out+'/registration-mobile.png',fullPage:true});
 await page.getByText('Datos de pago',{exact:true}).click();await expect(page.getByText('Titular: Alan Burga')).toBeVisible();
 expect(await page.getByRole('link',{name:'Contactar al organizador',exact:true}).count()).toBe(0);fixture.event.publicOrganizerPhone='999777888';fixture.status='CONFIRMED';fixture.competitorNumber=27;await page.getByRole('button',{name:'Actualizar estado',exact:true}).click();await expect(page.getByText('0027',{exact:true})).toBeVisible();await page.screenshot({path:out+'/registration-accepted-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:out+'/registration-desktop.png',fullPage:true});
 await page.goto(origin+'/');await page.setViewportSize({width:390,height:844});
 const input=page.getByRole('textbox',{name:'Código de inscripción'});
 await input.fill('INVALIDO');await page.getByRole('button',{name:'Consultar',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
 await input.fill(fixture.registrationCode);await page.getByRole('button',{name:'Consultar',exact:true}).click();await expect(page.locator('.lookup-result').getByText(fixture.event.title)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:out+'/registration-lookup-mobile.png',fullPage:true});
 await page.getByRole('link',{name:'Ver constancia',exact:true}).click();await expect(page.getByRole('heading',{name:'Constancia de inscripción',exact:true})).toBeVisible();await expect(page.getByText('0027',{exact:true})).toBeVisible();expect(await page.getByText('Michael Herencia',{exact:true}).count()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const whatsapp=page.getByRole('link',{name:'Contactar al organizador',exact:true});await expect(whatsapp).toBeVisible();const contactUrl=new URL(await whatsapp.getAttribute('href'));expect(contactUrl.hostname).toBe('wa.me');expect(contactUrl.pathname).toBe('/51999777888');expect(contactUrl.searchParams.get('text')).toContain(fixture.registrationCode);expect(contactUrl.searchParams.get('text')).not.toContain('test-token');await page.screenshot({path:out+'/registration-public-receipt-mobile.png',fullPage:true});
 expect(errors).toEqual([]);console.log('Constancia y consulta: móvil 390px/escritorio 1440px, copia, pago expandible, error y resultado aprobados. API simulada; backend cubierto por pruebas de invitados.');
}finally{await browser?.close();await vite.close();}
