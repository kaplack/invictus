import React,{useState} from 'react';
import {Modal} from './Modal.jsx';
import {OutlineIcon} from './OutlineIcon.jsx';
import {fileUrl} from '../services/api.js';

export function EventRoutePreview({route,onClose}) {
 const [zoomed,setZoomed]=useState(false);
 return <Modal title={route.title||'Ruta del evento'} className="event-route-modal" onClose={onClose}>
  <div className="event-route-preview-actions"><button type="button" className="secondary event-route-zoom" aria-label={zoomed?'Reducir imagen':'Ampliar imagen'} title={zoomed?'Reducir imagen':'Ampliar imagen'} aria-pressed={zoomed} onClick={()=>setZoomed(value=>!value)}><OutlineIcon name={zoomed?'zoomOut':'zoomIn'}/></button></div>
  <div className={'event-route-preview'+(zoomed?' is-zoomed':'')} tabIndex={0} role="region" aria-label="Imagen de la ruta; desplázate para ver los detalles">
   <img src={fileUrl(route.fileId)} alt={route.title||'Ruta del evento'}/>
  </div>
  {route.description&&<p className="event-route-preview-description">{route.description}</p>}
 </Modal>;
}
