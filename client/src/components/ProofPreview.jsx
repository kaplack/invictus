import React,{useEffect,useState} from 'react';
import {Modal} from './Modal.jsx';
import '../styles/proof-preview.css';

export function ProofPreview({url,close}) {
 const [preview,setPreview]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let objectUrl;
  setPreview(null);setError('');
  (async()=>{try{
   const response=await fetch(url,{credentials:'include',signal:controller.signal});
   if(!response.ok)throw new Error('No se pudo cargar el comprobante.');
   const blob=await response.blob();if(controller.signal.aborted)return;
   objectUrl=URL.createObjectURL(blob);setPreview({url:objectUrl,type:blob.type});
  }catch(e){if(!controller.signal.aborted)setError(e.message||'No se pudo cargar el comprobante.');}})();
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[url,revision]);
 return <div className="proof-preview"><Modal title="Comprobante de pago" onClose={close}>
  {!preview&&!error&&<p role="status">Cargando comprobante…</p>}
  {error&&<div role="alert"><p>{error}</p><button className="secondary" onClick={()=>setRevision(v=>v+1)}>Reintentar</button></div>}
  {preview&&<>
   {preview.type.startsWith('image/')?<img src={preview.url} alt="Comprobante de pago" onError={()=>setError('No se pudo mostrar la imagen del comprobante.')}/>:preview.type==='application/pdf'?<object data={preview.url} type="application/pdf" aria-label="Comprobante de pago PDF"><p>Tu navegador no permite visualizar este PDF. Puedes descargarlo abajo.</p></object>:<p>Este formato no permite vista previa. Puedes descargar el archivo.</p>}
   <a className="button secondary" href={preview.url} download={'comprobante'+(preview.type==='application/pdf'?'.pdf':preview.type==='image/png'?'.png':preview.type==='image/jpeg'?'.jpg':'')}>Descargar comprobante</a>
  </>}
 </Modal></div>;
}
