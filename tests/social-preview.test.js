import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {socialTags,renderSocialHtml,createPublicWebRouter,previewStart,previewEnd} from '../server/social-preview.js';

const publicUrl='https://invictus.example';
const template=`<html><head>${previewStart}<title>Anterior</title>${previewEnd}</head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>`;
test('Vista general usa URLs absolutas y la imagen existente',()=>{
 const html=renderSocialHtml(template,{publicUrl});
 assert.match(html,/property="og:image" content="https:\/\/invictus.example\/images\/evento.png"/);
 assert.match(html,/property="og:url" content="https:\/\/invictus.example\/"/);
 assert.equal((html.match(/<title>/g)||[]).length,1);
 assert.match(html,/<div id="root"><\/div>/);
});
test('Afiche, descripción y título del evento se escapan en el HTML',()=>{
 const html=socialTags({publicUrl,event:{title:'Carrera "Sol" <script>',description:'Uno\n dos & tres',publicSlug:'carrera-sol',primaryImageFileId:'afiche',bannerImageFileId:'banner'}});
 assert.match(html,/Carrera &quot;Sol&quot; &lt;script&gt;/);
 assert.match(html,/Uno dos &amp; tres/);
 assert.match(html,/https:\/\/invictus.example\/api\/files\/afiche\/public/);
 assert.match(html,/https:\/\/invictus.example\/eventos\/carrera-sol/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(socialTags({publicUrl,event:{title:'Sin afiche',publicSlug:'sin-afiche'}}),/\/images\/evento.png/);
});
test('HTTP entrega metadatos sin JavaScript y conserva los controles de publicación',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'invictus-preview-'));
 try {
  await writeFile(join(directory,'index.html'),template);
  const app=express();
  app.use(createPublicWebRouter({publicUrl,directory,events:{async detail(slug){
   if(slug!=='publicado')throw Object.assign(new Error('No encontrado'),{status:404});
   return {title:'Evento publicado',publicSlug:slug,primaryImageFileId:'afiche'};
  }}}));
  app.use((req,res)=>res.sendStatus(404));
  app.use((err,req,res,next)=>res.status(err.status||500).send('No encontrado'));
  const response=await request(app).get('/eventos/publicado').expect(200).expect('Content-Type',/html/);
  assert.match(response.text,/og:title" content="Evento publicado · Invictus/);
  assert.match(response.text,/\/api\/files\/afiche\/public/);
  await request(app).get('/eventos/borrador').expect(404);
  await request(app).get('/api/inexistente').expect(404);
  await request(app).get('/assets/falta.js').expect(404);
  const home=await request(app).get('/').expect(200);
  assert.match(home.text,/og:site_name/);
  const privatePage=await request(app).get('/inscripcion/token-privado').expect(200);
  assert.doesNotMatch(privatePage.text,/content="[^"]*token-privado/);
 } finally {await rm(directory,{recursive:true,force:true});}
});
