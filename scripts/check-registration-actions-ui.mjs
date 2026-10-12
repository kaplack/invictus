import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const eventId='12345678-1234-4234-8234-123456789012';
const event={id:eventId,title:'Nado Halloween',status:'PUBLISHED',categories:[]};
const registration={id:'r1',categoryId:'c1',status:'PENDING_REVIEW',version:1,amountCents:10000,currency:'PEN',participantSnapshot:{name:'Rafael',lastName:'Burga',email:'rafael@example.test',phone:'987654321'},categorySnapshot:{name:'Master con aletas'},paymentInstructionsSnapshot:{type:'YAPE',label:'Yape',holder:'Alan Burga',phone:'980784509'},proofPaymentId:'p1',event,payments:[{id:'p1',proofFileId:'f1',status:'pending_review',createdAt:'2026-10-05T20:40:00Z'}],audits:[{id:'a1',toStatus:'PENDING_REVIEW',createdAt:'2026-10-05T20:40:00Z',actor:null}]};
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/registrations')&&new URL(route.request().url()).searchParams.has('status'))await new Promise(resolve=>setTimeout(resolve,350));
  if(path.endsWith('/proof'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
  if(path.endsWith('/review')){const input=route.request().postDataJSON();assert.equal(input.decision,'CONFIRMED');registration.status='CONFIRMED';registration.version++;registration.audits.push({id:'a2',toStatus:'CONFIRMED',createdAt:'2026-10-11T16:00:00Z',actor:{name:'Alan',lastName:'Burga'}});return route.fulfill({json:registration});}
  const data=path.endsWith('/auth/session')?{user:{id:'u1',name:'Alan',role:'USER'}}:path.endsWith('/registrations')?{items:[registration],total:1,nextOffset:null,summary:{occupied:1,capacity:50,statuses:{[registration.status]:1}},categories:[{id:'c1',name:'Master con aletas',occupied:1,capacity:null}]}:path.endsWith('/registrations/r1')?registration:event;
  await route.fulfill({json:data});
 });
 await page.goto(`http://localhost:5173/mis-eventos/${eventId}/inscripciones`);
 await expect(page.getByRole('progressbar',{name:'Cupos reservados'})).toHaveAttribute('value','1');
 await expect(page.getByText('49 disponibles',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Detalles por categoría'}).click();
 const categories=page.getByRole('dialog',{name:'Cupos por categoría'});
 await expect(categories.getByText('Master con aletas',{exact:true})).toBeVisible();
 await expect(categories.getByText('Las categorías sin límite propio comparten los 50 cupos del evento.')).toBeVisible();
 await page.keyboard.press('Escape');await expect(categories).toHaveCount(0);
 const accepted=page.getByRole('button',{name:'Aceptadas 0',exact:true});
 await accepted.evaluate(el=>{el.dataset.retained='yes';});
 await accepted.click();await expect(accepted).toHaveAttribute('aria-pressed','true');
 await expect(page.getByText('Actualizando inscripciones…',{exact:true})).toBeVisible();
 await expect(accepted).toBeFocused();await expect(accepted).toHaveAttribute('data-retained','yes');
 await expect(page.locator('.registration-results')).toHaveAttribute('aria-busy','false');
 await expect(accepted).toBeFocused();await expect(accepted).toHaveAttribute('data-retained','yes');
 await expect(page.locator('.participants-desktop-filters select[name=status]')).toHaveValue('CONFIRMED');
 await accepted.click();await expect(accepted).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('.participants-desktop-filters select[name=status]')).toHaveValue('');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  const list=page.locator(width===1440?'table.records':'.mobile-records');
  if(width===1440){
   await expect(list.locator('thead th')).toHaveCount(7);
   const geometry=await list.evaluate(table=>{const row=table.querySelector('tbody tr'),cell=row.lastElementChild;return {rowHeight:row.getBoundingClientRect().height,actionsWidth:cell.getBoundingClientRect().width,tableRight:table.getBoundingClientRect().right,actionsRight:cell.getBoundingClientRect().right};});
   assert.ok(geometry.rowHeight<180,`Unexpected row height: ${geometry.rowHeight}`);
   assert.ok(geometry.actionsWidth>=150,`Actions column too narrow: ${geometry.actionsWidth}`);
   assert.ok(geometry.actionsRight<=geometry.tableRight+1);
   await expect(list.getByRole('button',{name:'Ver inscripción',exact:true})).toBeVisible();
   await expect(list.getByRole('button',{name:'Ver comprobante',exact:true})).toBeVisible();
   await expect(list.getByRole('button',{name:'Ver historial',exact:true})).toBeVisible();
  }
  if(width===390){
   await expect(list.getByRole('link',{name:'Escribir por WhatsApp al 987654321'})).toHaveAttribute('href','https://wa.me/51987654321');
   await expect(list.getByText('Importe y método',{exact:true})).toBeHidden();
   await expect(list.locator('.compact-participant-heading').getByText('Rafael Burga',{exact:true})).toBeVisible();
  }
  await list.getByRole('button',{name:'Ver inscripción',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Detalle de inscripción'});
  await expect(drawer).toBeVisible();await expect(list).toBeVisible();
  await expect(drawer.getByRole('tab',{name:'Inscripción',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(drawer.getByText('Celular: 980784509')).toBeHidden();
  await drawer.getByText('Datos de la cuenta receptora',{exact:true}).click();await expect(drawer.getByText('Celular: 980784509')).toBeVisible();
  await drawer.getByRole('tab',{name:'Historial (1)',exact:true}).click();await expect(drawer.getByRole('heading',{name:'Historial de cambios'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(drawer).toHaveCount(0);
  await expect(list.getByRole('button',{name:'Ver inscripción',exact:true})).toBeFocused();
  await list.getByRole('button',{name:'Ver historial',exact:true}).click();await expect(drawer.getByRole('tab',{name:'Historial (1)',exact:true})).toHaveAttribute('aria-selected','true');
  await drawer.getByRole('button',{name:'Cerrar',exact:true}).click();
  await list.getByRole('button',{name:'Ver comprobante',exact:true}).click();
  const proof=page.getByRole('dialog',{name:'Comprobante de pago'});await expect(proof.getByRole('img')).toBeVisible();await expect(proof.getByText(/Cuenta receptora: Yape · Alan Burga · 980784509/)).toBeVisible();
  await proof.getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('table').getByRole('button',{name:'Ver inscripción',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Detalle de inscripción'});
 await drawer.getByRole('button',{name:'Ver comprobante',exact:true}).click();await expect(page.getByRole('dialog',{name:'Comprobante de pago'}).getByRole('img')).toBeVisible();await page.keyboard.press('Escape');await expect(drawer).toBeVisible();
 await drawer.getByRole('button',{name:'Guardar revisión',exact:true}).click();await expect(drawer.getByText('Revisión guardada.')).toBeVisible();await expect(drawer.getByRole('tab',{name:'Historial (2)'})).toBeVisible();
 console.log('Passed: capacity bar, category modal, state chip toggle and selector sync; desktop/mobile actions, tabs, recipient disclosure, proof modal, nested proof, focus restoration and review refresh.');
} finally {await browser.close();}
