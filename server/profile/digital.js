import { AppError } from '@base/usuarios-acceso';
const hosts = {
 INSTAGRAM: ['instagram.com','www.instagram.com'], TIKTOK: ['tiktok.com','www.tiktok.com'],
 FACEBOOK: ['facebook.com','www.facebook.com'], YOUTUBE: ['youtube.com','www.youtube.com'],
 LINKEDIN: ['linkedin.com','www.linkedin.com']
};
const labels = {INSTAGRAM:'Instagram',TIKTOK:'TikTok',FACEBOOK:'Facebook',YOUTUBE:'YouTube',LINKEDIN:'LinkedIn'};
const invalid = (label,message) => { throw new AppError(label + ': ' + message,400,'INVALID_DIGITAL_LINK'); };
export function normalizeLink(value,platform) {
 const label = labels[platform] || 'Sitio web';
 if (typeof value !== 'string') invalid(label,'ingresa un enlace válido.');
 let text=value.trim(); if (!text) return null;
 if (text.length>2048 || /[\\\s\u0000-\u001f\u007f]/.test(text)) invalid(label,'revisa el formato del enlace.');
 if (platform==='INSTAGRAM' || platform==='TIKTOK') {
   const handle=text.replace(/^@/,'');
   if (/^[a-zA-Z0-9._]+$/.test(handle) && !/^(www\.|instagram\.com|tiktok\.com)/i.test(handle)) {
     const limit=platform==='INSTAGRAM'?30:24;
     if (handle.length>limit || handle.endsWith('.') || handle.startsWith('.') || handle.includes('..')) invalid(label,'revisa el nombre de usuario.');
     text='https://'+hosts[platform][0]+'/'+(platform==='TIKTOK'?'@':'')+handle;
   }
 }
 if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text='https://'+text;
 let url;try {url=new URL(text);} catch {invalid(label,'ingresa una URL válida.');}
 if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.port || !url.hostname.includes('.')) invalid(label,'usa un enlace HTTP o HTTPS sin credenciales ni puerto.');
 if (platform) {
   if (!hosts[platform]?.includes(url.hostname)) invalid(label,'el dominio no corresponde a esta red.');
   const path=url.pathname;
   if (platform==='INSTAGRAM' && (!/^\/[a-zA-Z0-9._]{1,30}\/?$/.test(path) || ['accounts','explore','reels','direct','stories','p','reel'].includes(path.split('/')[1].toLowerCase()))) invalid(label,'usa el enlace de un perfil.');
   if (platform==='TIKTOK' && !/^\/@[a-zA-Z0-9._]{1,24}\/?$/.test(path)) invalid(label,'usa el enlace de un perfil con @usuario.');
   if (platform==='YOUTUBE' && !/^\/(?:@[^/]+|(?:channel|c|user)\/[^/]+)\/?$/.test(path)) invalid(label,'usa un canal o perfil de YouTube.');
   if (platform==='LINKEDIN' && !/^\/(?:in|company)\/[^/]+\/?$/.test(path)) invalid(label,'usa un perfil o página de LinkedIn.');
   if (platform==='FACEBOOK' && (path==='/' || /^\/(?:l\.php|share|sharer|sharer\.php|watch|reel|reels)(?:\/|$)/i.test(path))) invalid(label,'usa un perfil o página de Facebook.');
   url.protocol='https:';url.hostname=hosts[platform][0];url.hash='';
   const profileId=platform==='FACEBOOK' && path==='/profile.php' ? url.searchParams.get('id') : null;
   if(platform==='FACEBOOK' && path==='/profile.php' && !/^\d+$/.test(profileId || '')) invalid(label,'revisa el identificador del perfil.');
   url.search='';if(profileId)url.searchParams.set('id',profileId);
 } else {
   if (url.hostname==='localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) invalid(label,'usa el dominio de tu sitio web.');
 }
 if(url.href.length>2048)invalid(label,'el enlace es demasiado largo.');
 return url.href;
}
export function parseDigital(raw) {
 if (!raw || typeof raw!=='object' || Array.isArray(raw)) return raw;
 const data={...raw};
 if (Object.hasOwn(data,'websiteUrl')) data.websiteUrl=data.websiteUrl===null?null:normalizeLink(data.websiteUrl);
 if (Object.hasOwn(data,'socialLinks')) {
   if(!Array.isArray(data.socialLinks)||data.socialLinks.length>5)invalid('Redes sociales','envía como máximo cinco enlaces.');
   const seen=new Set();
   data.socialLinks=data.socialLinks.map(link=>{
     if(!link || !Object.hasOwn(hosts,link.platform))invalid('Redes sociales','plataforma no admitida.');
     if(seen.has(link.platform))invalid(labels[link.platform],'solo se permite un enlace por plataforma.');
     seen.add(link.platform);return {platform:link.platform,url:normalizeLink(link.url,link.platform)};
   }).filter(link=>link.url!==null);
 }
 return data;
}
