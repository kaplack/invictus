import React,{useEffect,useId,useRef,useState} from 'react';
import {api,base,fileUrl} from '../services/api.js';
export function ImagePicker({label,fileId,file,onChange,privateFile=false,disabled=false}){
 const input=useRef(null),id=useId(),[preview,setPreview]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let alive=true,local;
  if(file){local=URL.createObjectURL(file);setPreview(local);}else if(!fileId)setPreview('');else if(!privateFile)setPreview(fileUrl(fileId));else{setPreview('');api('/files/'+fileId+'/access').then(r=>{if(alive)setPreview(base.replace(/\/api$/,'')+r.url);}).catch(()=>{if(alive)setError('No se pudo cargar la vista previa.');});}
  return()=>{alive=false;if(local)URL.revokeObjectURL(local);};
 },[file,fileId,privateFile]);
 return <div className="event-image-picker"><span>{label}</span>{preview&&<img src={preview} alt={label}/>}<input ref={input} id={id} type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={e=>{const image=e.target.files[0];if(!image)return;if(!['image/png','image/jpeg','image/webp'].includes(image.type)||image.size>10*1024*1024){setError('Elige PNG, JPG o WebP de hasta 10 MB.');return;}setError('');onChange(image);e.target.value='';}}/><button type="button" className="secondary" disabled={disabled} onClick={()=>input.current.click()}>{preview?'Cambiar imagen':'Agregar imagen'}</button><small>{privateFile?'QR privado':'Imagen pública'} · PNG, JPG o WebP · hasta 10 MB</small>{error&&<p role="alert">{error}</p>}</div>;
}
