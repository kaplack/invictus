import React,{useEffect,useRef,useState} from 'react';
import {api,fileUrl} from '../services/api.js';
import {OutlineIcon} from './OutlineIcon.jsx';
import '../styles/event-rules.css';

export function EventRulesLink({fileId}) {
 return <a className="secondary event-rules-link" href={fileUrl(fileId)} target="_blank" rel="noopener noreferrer"><OutlineIcon name="note"/><span>Ver bases <small>PDF</small></span><OutlineIcon name="external"/></a>;
}
export function EventRules({fileId,file,locked,onChange}) {
 const input=useRef(null),[error,setError]=useState(''),[name,setName]=useState('Bases del evento.pdf'),[preview,setPreview]=useState(null);
 useEffect(()=>{let active=true;if(fileId)api('/files/'+fileId).then(data=>{if(active)setName(data.file?.name||data.name||'Bases del evento.pdf');}).catch(()=>{});return()=>{active=false;};},[fileId]);
 useEffect(()=>{if(!file){setPreview(null);return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 function select(e){const selected=e.target.files?.[0];e.target.value='';if(!selected)return;if(!/\.pdf$/i.test(selected.name)||selected.type!=='application/pdf'){setError('Selecciona un archivo PDF.');return;}if(!selected.size||selected.size>10*1024*1024){setError('El PDF debe tener contenido y pesar hasta 10 MB.');return;}setError('');onChange(selected);}
 return <section className="event-rules" aria-labelledby="event-rules-title"><div className="event-rules-heading"><OutlineIcon name="note"/><h2 id="event-rules-title">Bases del evento</h2><small>PDF</small></div><p className="event-rules-help">{locked?'No puedes modificar las bases porque el evento ya tiene inscritos.':'PDF público · Hasta 10 MB. Obligatorio para publicar; se bloquea con la primera inscripción.'}</p><div className="event-rules-row">{(file||fileId)?<a className="event-rules-file" href={preview||fileUrl(fileId)} target="_blank" rel="noopener noreferrer"><OutlineIcon name="note"/><span>{file?.name||name}</span><OutlineIcon name="external"/></a>:<span className="event-rules-empty">Sin PDF adjunto</span>}{!locked&&<><input ref={input} hidden type="file" accept="application/pdf,.pdf" aria-label="Seleccionar bases en PDF" onChange={select}/><button type="button" className="secondary event-rules-upload" onClick={()=>input.current.click()}><OutlineIcon name={file||fileId?'edit':'publish'}/>{file||fileId?'Reemplazar':'Adjuntar PDF'}</button></>}</div>{file&&<small role="status">PDF seleccionado. Guarda para cargarlo.</small>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
