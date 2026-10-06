import express from 'express';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export const previewStart = '<!-- invictus-social:start -->';
export const previewEnd = '<!-- invictus-social:end -->';
const defaultDescription = 'Encuentra tu próximo desafío y reconoce cada esfuerzo. Eventos y reconocimientos Invictus.';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function socialTags({publicUrl, apiUrl = '/api', event} = {}) {
 const origin = new URL(publicUrl).origin;
 const title = event ? `${event.title} · Invictus` : 'Invictus · Cada esfuerzo cuenta';
 const description = event?.description?.replace(/\s+/g, ' ').trim().slice(0, 240) || defaultDescription;
 const imageId = event?.primaryImageFileId || event?.bannerImageFileId;
 const image = imageId ? new URL(`${apiUrl.replace(/\/$/, '')}/files/${encodeURIComponent(imageId)}/public`, origin).href : `${origin}/images/evento.png`;
 const url = event ? `${origin}/eventos/${encodeURIComponent(event.publicSlug)}` : `${origin}/`;
 const meta = (property, content) => `<meta property="${property}" content="${escape(content)}"/>`;
 return `${previewStart}\n<title>${escape(title)}</title>\n<meta name="description" content="${escape(description)}"/>\n` +
  [['og:type','website'],['og:site_name','Invictus'],['og:locale','es_PE'],['og:title',title],['og:description',description],['og:url',url],['og:image',image],['og:image:alt',event?.title || 'Deportistas en un evento de natación Invictus']].map(([key,value])=>meta(key,value)).join('\n') +
  `\n<meta name="twitter:card" content="summary_large_image"/>\n${previewEnd}`;
}

export function renderSocialHtml(html, options) {
 const start = html.indexOf(previewStart), end = html.indexOf(previewEnd);
 if(start < 0 || end < start) throw new Error('Falta el bloque de vista previa en index.html');
 return html.slice(0,start) + socialTags(options) + html.slice(end + previewEnd.length);
}

// Serve the same application to people and crawlers; metadata needs no JavaScript.
export function createPublicWebRouter({events, publicUrl, directory = fileURLToPath(new URL('../dist/', import.meta.url))}) {
 const router = express.Router();
 const send = async (req,res,event) => {
  const html = await readFile(`${directory}/index.html`, 'utf8');
  res.set('Cache-Control','no-store').type('html').send(renderSocialHtml(html,{publicUrl,event}));
 };
 router.get('/eventos/:slug', async (req,res) => {
  const event = await events.detail(req.params.slug);
  await send(req,res,event);
 });
 router.get(['/', '/eventos'], (req,res) => send(req,res));
 router.use(express.static(directory,{index:false}));
 router.get('/{*path}', (req,res,next) => {
  if(req.path.startsWith('/api/') || req.path === '/api' || /\.[^/]+$/.test(req.path))return next();
  return send(req,res);
 });
 return router;
}
