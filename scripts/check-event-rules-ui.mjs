import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const id='12345678-1234-4234-8234-123456789012';
let locked=false;
try {
 const page=await browser.newPage();
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const event={id,title:'Competencia de prueba',description:'Descripción',status:'DRAFT',mode:'MANAGED',startsAt:'2027-01-01T12:00:00Z',rulesFileId:id,venue:'Lima',competitionConfig:null,lifecycle:{conditionsLocked:locked},configuration:{maxCapacity:50}};
  const json=path.endsWith('/auth/session')?{user:{id:'u1',role:'USER',name:'Organizador'}}:path.endsWith('/my-registration')?null:path.endsWith('/setup')?{categories:[],methods:[],methodIds:[],hasRegistrations:locked,editable:!locked}:path==='/api/disciplines'?[]:path.startsWith('/api/files/')?{file:{name:'Bases de la competencia.pdf'}}:event;
  await route.fulfill({json});
 });
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto(`http://localhost:5173/mis-eventos/${id}/editar?paso=2`);
  const section=page.locator('.event-rules');await expect(section).toBeVisible();
  await expect(section.getByRole('button',{name:'Reemplazar'})).toBeVisible();
  await section.locator('input[type=file]').setInputFiles({name:'Reglas.txt',mimeType:'text/plain',buffer:Buffer.from('texto')});
  await expect(section.getByRole('alert')).toHaveText('Selecciona un archivo PDF.');
  await section.locator('input[type=file]').setInputFiles({name:'Bases nuevas.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nprueba')});
  await expect(section.getByRole('link')).toHaveText('Bases nuevas.pdf');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await section.screenshot({path:`test-results/event-rules-${width}.png`});
 }
 locked=true;await page.reload();
 await expect(page.locator('.event-rules')).toContainText('No puedes modificar las bases porque el evento ya tiene inscritos.');
 await expect(page.locator('.event-rules button')).toHaveCount(0);
 await page.setViewportSize({width:390,height:900});
 await page.goto('http://localhost:5173/eventos/competencia');
 await expect(page.getByRole('link',{name:'Ver bases PDF'})).toBeVisible();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 console.log('PDF: selección, error, bloqueo y responsive 390/1440 verificados.');
}finally{await browser.close();}
