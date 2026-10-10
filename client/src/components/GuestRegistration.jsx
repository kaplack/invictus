import {classificationLabel} from '../helpers/registration-classification.js';
import {navigate} from '../services/navigation.js';
import React,{useState} from 'react';
import {api,base} from '../services/api.js';
import {useData,useAction} from '../hooks/data.js';
import {Modal} from './Modal.jsx';
import {State,Feedback} from './UI.jsx';
import {ParticipantFields,ProofField,PaymentInstructions,RegistrationStatus} from './CategoryRegistration.jsx';
import {categoryPrice,paymentTypes} from './EventSetup.jsx';
async function guestApi(token,path,method='GET',body){const res=await fetch(base+path,{method,credentials:'omit',headers:{'X-Registration-Token':token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await res.json();if(!res.ok){const error=new Error(data.error?.message||'No se pudo completar la solicitud');error.status=res.status;throw error;}return data;}
async function proofUpload(token,eventId,file){const res=await fetch(base+'/events/'+eventId+'/guest-proof',{method:'POST',credentials:'omit',headers:{'X-Registration-Token':token,'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)},body:file});const data=await res.json();if(!res.ok)throw new Error(data.error?.message||'No se pudo cargar el comprobante');return data.file.id;}
const general={id:null,name:'Inscripción general',priceCents:0,currency:'PEN',minAge:null,maxAge:null,gender:null};
function participant(form){const data=new FormData(form);return {name:data.get('name'),lastName:data.get('lastName'),phone:data.get('phone'),birthDate:data.get('birthDate')||null,gender:data.get('gender')||null};}
const key=id=>'guest-registration:'+id;
export function GuestEnrollment({event,close,initialCategoryId=''}){
 const resource=useData('/events/'+event.id+'/guest-registration-options'),action=useAction();
 const [categoryId,setCategory]=useState(initialCategoryId),[methodId,setMethod]=useState(''),[file,setFile]=useState(null),[modality,setModality]=useState('');
 return <Modal title={'Inscribirme · '+event.title} onClose={close} busy={action.busy}><p>No necesitas crear una cuenta.</p><State resource={resource}>{data=>{
 const selected=data.categories.length?(data.categories.length===1?data.categories[0]:data.categories.find(c=>c.id===categoryId)):general,category=selected?{...selected,competitionConfig:data.competitionConfig}:null,method=data.methods.find(m=>m.id===methodId);
 return <form className="form" onSubmit={e=>{e.preventDefault();const person=participant(e.currentTarget);action.run(async()=>{
 let token=sessionStorage.getItem(key(event.id));if(!token){token=(await api('/events/'+event.id+'/guest-registration-token','POST',{})).token;sessionStorage.setItem(key(event.id),token);}
 try{await guestApi(token,'/guest-registration');navigate('/inscripcion/'+token);close();return;}catch(error){if(error.status!==404)throw error;}
 const proofFileId=file&&category.priceCents?await proofUpload(token,event.id,file):null;
 await guestApi(token,'/events/'+event.id+'/guest-registrations','POST',{categoryId:category.id,modality:modality||null,methodId:category.priceCents?methodId:null,participant:person,proofFileId});navigate('/inscripcion/'+token);close();
 });}}><fieldset className="form" disabled={action.busy}>
 {data.categories.length>1&&<label>{data.competitionConfig?'Distancia':'Categoría'}<select aria-label={data.competitionConfig?'Distancia':'Categoría'} required value={categoryId} onChange={e=>{setCategory(e.target.value);setModality('');setMethod('');setFile(null);}}><option value="">{data.competitionConfig?'Selecciona una distancia':'Selecciona una categoría'}</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name} · {categoryPrice(c)}</option>)}</select></label>}
 {data.categories.length===1&&<p><strong>{data.competitionConfig?'Distancia':'Categoría'}:</strong> {data.categories[0].name}</p>}
      {category&&<><strong>{categoryPrice(category)}</strong><ParticipantFields category={category} guest modalityValue={modality} onModalityChange={setModality}/>
 {category.priceCents>0&&<><label>Medio de pago<select required value={methodId} onChange={e=>{setMethod(e.target.value);setFile(null);}}><option value="">Selecciona un medio</option>{data.methods.filter(m=>m.currency===category.currency).map(m=><option key={m.id} value={m.id}>{m.label} · {paymentTypes[m.type]}</option>)}</select></label>{method&&<><PaymentInstructions method={method} qrPath={'/events/'+event.id+'/guest-payment-methods/'+method.id+'/qr'}/><ProofField key={method.id} required={method.type!=='CASH'} setFile={setFile}/></>}</>}
 <p>Tu inscripción quedará pendiente de revisión. Al enviarla recibirás un enlace privado para consultar el estado.</p><button disabled={category.priceCents>0&&!method}>Enviar inscripción</button></>}
 </fieldset><Feedback state={action}/></form>;
 }}</State></Modal>;
}
export function GuestRegistration({token}){
 const resource=useData('/guest-registration?token='+encodeURIComponent(token)),action=useAction(),[file,setFile]=useState(null),[copied,setCopied]=useState(false);
 const link=location.origin+'/inscripcion/'+token;
 return <section className="public-events"><h1>Tu inscripción</h1><State resource={resource}>{data=><article className="detail"><h2>{data.event.title}</h2><RegistrationStatus status={data.status}/><p>{data.participantSnapshot.name} {data.participantSnapshot.lastName} · {classificationLabel(data.categorySnapshot)}</p><p>{data.participantSnapshot.phone} · {categoryPrice({priceCents:data.amountCents,currency:data.currency})}</p>
 <div className="callout form"><p>Guarda este enlace privado para consultar tu estado. Quien tenga el enlace podrá ver tu inscripción.</p><label>Enlace privado<input readOnly value={link} onFocus={e=>e.target.select()}/></label><button className="secondary" onClick={()=>action.run(async()=>{await navigator.clipboard.writeText(link);setCopied(true);})}>{copied?'Enlace copiado':'Copiar enlace'}</button></div>
 {data.reviewNote&&<p className="callout">{data.reviewNote}</p>}<PaymentInstructions method={data.paymentInstructionsSnapshot} qrPath={'/guest-registration/qr?token='+encodeURIComponent(token)}/>
 {data.payments.map(p=><p key={p.id}>{p.proofFileId&&<a className="button secondary" target="_blank" rel="noreferrer" href={base+'/guest-registration/payments/'+p.id+'/proof?token='+encodeURIComponent(token)}>Ver comprobante</a>}</p>)}
 {data.status==='OBSERVED'&&<form className="form" key={data.version} onSubmit={e=>{e.preventDefault();const person=participant(e.currentTarget);action.run(async()=>{const proofFileId=file?await proofUpload(token,token.split('.')[0],file):null;await guestApi(token,'/guest-registration/resubmit','POST',{version:data.version,participant:person,proofFileId});setFile(null);resource.reload();});}}><h3>Corregir inscripción</h3><fieldset disabled={action.busy} className="form"><ParticipantFields guest category={data.categorySnapshot} participant={data.participantSnapshot}/>{data.amountCents>0&&<ProofField required={data.paymentInstructionsSnapshot.type!=='CASH'} setFile={setFile}/>}<button>Reenviar inscripción</button></fieldset></form>}
 <p><button className="secondary" onClick={()=>resource.reload()}>Actualizar estado</button></p><a href={'/eventos/'+data.event.publicSlug}>Volver al evento</a></article>}</State><Feedback state={action}/></section>;
}
