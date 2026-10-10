import React from 'react';
import {ImagePicker} from './ImagePicker.jsx';
import '../styles/route-images.css';
export function RouteImagesEditor({routes,onChange,disabled=false}) {
 const update=(index,patch)=>onChange(routes.map((r,i)=>i===index?{...r,...patch}:r));
 const move=(index,offset)=>{const next=[...routes];[next[index],next[index+offset]]=[next[index+offset],next[index]];onChange(next);};
 return <div className="route-images-editor">
 <p>Agrega los mapas y detalles de los recorridos. Puedes incluir varias imágenes de una misma ruta.</p>
 <div className="route-image-list">{routes.map((route,index)=><fieldset className="route-image-entry" key={route.key} disabled={disabled} aria-label={'Imagen de ruta '+(index+1)}>
 <h4 className="route-image-heading">Imagen de ruta {index+1}</h4>
 <ImagePicker hideLabel label={'Imagen de ruta '+(index+1)} fileId={route.fileId} file={route.file} onChange={file=>update(index,{file})} disabled={disabled}/>
 <label>Título<input value={route.title} maxLength={180} placeholder="Nado · 3 km" onChange={e=>update(index,{title:e.target.value})}/></label>
 <label>Descripción<textarea value={route.description||''} maxLength={2000} placeholder="Recorrido, salida, llegada o puntos de referencia" onChange={e=>update(index,{description:e.target.value})}/></label>
 <div className="route-image-actions"><button type="button" className="secondary" disabled={index===0} onClick={()=>move(index,-1)} aria-label={'Subir imagen de ruta '+(index+1)}>↑</button><button type="button" className="secondary" disabled={index===routes.length-1} onClick={()=>move(index,1)} aria-label={'Bajar imagen de ruta '+(index+1)}>↓</button><button type="button" className="secondary" onClick={()=>onChange(routes.filter((_,i)=>i!==index))}>Quitar imagen</button></div>
 </fieldset>)}</div>
 <button type="button" className="secondary" disabled={disabled} onClick={()=>onChange([...routes,{key:crypto.randomUUID(),fileId:null,file:null,title:'',description:''}])}><span aria-hidden="true">＋</span> Agregar imagen de ruta</button>
 </div>;
}
