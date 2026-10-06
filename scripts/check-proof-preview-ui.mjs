import {chromium,expect} from '@playwright/test';
const b=await chromium.launch({channel:'msedge',headless:true});
try{const p=await b.newPage();let failed=false,downloads=0;p.on('download',()=>downloads++);
await p.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;let json;
if(path.endsWith('/proof'))return failed?r.fulfill({status:403,json:{error:{message:'No disponible'}}}):r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
if(path.endsWith('/auth/session'))json={user:{id:'u1',name:'Test'}};
else if(path.endsWith('/registrations'))json={items:[{id:'r1',categoryId:'c1',status:'CONFIRMED',user:{name:'Test'}}],total:1,nextOffset:null,summary:{occupied:1,capacity:50,statuses:{}},categories:[]};
else if(path.endsWith('/registrations/r1'))json={event:{title:'Evento'},categorySnapshot:{name:'General'},participantSnapshot:{name:'Test',email:'test@example.test'},status:'CONFIRMED',payments:[{id:'p1',proofFileId:'f1',createdAt:new Date().toISOString(),status:'verified'}],audits:[]};
else json={id:'e1',title:'Evento'};return r.fulfill({json});});
await p.goto('http://localhost:5173/mis-eventos/e1/inscripciones');await p.getByRole('button',{name:'Ver y revisar'}).click();await p.getByRole('button',{name:'Ver comprobante'}).click();await expect(p.getByRole('dialog')).toBeVisible();await expect(p.getByAltText('Comprobante de pago')).toBeVisible();await expect(p.getByRole('link',{name:'Descargar comprobante'})).toHaveAttribute('download', 'comprobante.png');if(downloads)throw Error('Descarga inesperada');await p.keyboard.press('Escape');await expect(p.getByRole('dialog')).toHaveCount(0);
failed=true;await p.getByRole('button',{name:'Ver comprobante'}).click();await expect(p.getByRole('alert')).toContainText('No se pudo cargar');failed=false;await p.getByRole('button',{name:'Reintentar'}).click();await expect(p.getByAltText('Comprobante de pago')).toBeVisible();await p.setViewportSize({width:390,height:844});if(!await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Overflow');console.log('Comprobante: modal, imagen, sin descarga automática, Escape, error/reintento y móvil aprobados');
}finally{await b.close();}
