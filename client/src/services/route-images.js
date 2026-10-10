import {upload} from './api.js';
export const routeImageDrafts=event=>(event.routeImages??(event.routeImageFileId?[{fileId:event.routeImageFileId,title:'Ruta del evento'}]:[])).map(r=>({...r,key:crypto.randomUUID(),description:r.description||'',file:null}));
export async function saveRouteImages(routes,onUploaded) {
 for(const [index,route] of routes.entries()){
  if(!route.title.trim())throw Error('Escribe el título de la imagen de ruta '+(index+1)+'.');
  if(!route.file&&!route.fileId)throw Error('Agrega la imagen de ruta '+(index+1)+' o quita la entrada.');
 }
 const saved=[];
 for(const route of routes){let fileId=route.fileId;if(route.file){fileId=(await upload(route.file,'public')).id;onUploaded(route.key,fileId);}saved.push({fileId,title:route.title.trim(),description:route.description.trim()||null});}
 return saved;
}
