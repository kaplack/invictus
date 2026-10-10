import React,{useState,useEffect} from 'react';
import {api,fileUrl} from '../services/api.js';
import {useAction} from '../hooks/data.js';
import {Feedback} from './UI.jsx';
import {OutlineIcon} from './OutlineIcon.jsx';
import {IconAction} from './IconAction.jsx';
import {Modal} from './Modal.jsx';
import {eventPrice,eventDate} from './EventCards.jsx';
import {categoryPrice} from './EventSetup.jsx';
import {CategoryEnrollment} from './CategoryRegistration.jsx';
import {GuestEnrollment} from './GuestRegistration.jsx';
import '../styles/event-detail.css';
import {formatTimeLimit} from '../helpers/time-limit.js';
import '../styles/route-images.css';

export function EventDetail({event,user}) {
 const [categoryId,setCategory]=useState(''),[enrolling,setEnrolling]=useState(false),[sharing,setSharing]=useState(false);
 const action=useAction(),shareAction=useAction();
 const [registration,setRegistration]=useState(null),[checking,setChecking]=useState(!!user),[registrationError,setRegistrationError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setRegistration(null);setRegistrationError('');setChecking(!!user);if(user)api('/events/'+event.id+'/my-registration').then(r=>{if(active)setRegistration(r);}).catch(e=>{if(active)setRegistrationError(e.message);}).finally(()=>{if(active)setChecking(false);});return()=>{active=false;};},[event.id,user?.id,revision]);
 const routes=event.routeImages??(event.routeImageFileId?[{fileId:event.routeImageFileId,title:'Ruta del evento'}]:[]);
 const categories=event.categories||[],selected=categories.find(c=>c.id===categoryId);
 const informational=event.mode==='INFORMATIONAL',past=!event.startsAt||new Date(event.startsAt)<=new Date();
 const price=selected?{label:'Inscripción',value:categoryPrice(selected)}:eventPrice(event);
 const organizer=event.publicOrganizerName||event.team?.name;
 const shareUrl=typeof location==='undefined'?event.publicUrl:location.origin+'/eventos/'+event.publicSlug;
 const time=value=>value?new Intl.DateTimeFormat('es-PE',{hour:'numeric',minute:'2-digit',timeZone:event.timeZone||'America/Lima'}).format(new Date(value)):null;
 const startTime=time(event.startsAt);
 function register(){
  if(informational||past||action.busy||checking||registration||registrationError)return;
  setEnrolling(true);
 }
 const registrationLabel=registration?({CONFIRMED:'Ya estás inscrito',COMPLETED:'Inscripción finalizada',OBSERVED:'Inscripción observada',REJECTED:'Inscripción rechazada',CANCELLED:'Inscripción cancelada'}[registration.status]||'Inscripción pendiente'):null;
 const registerButton=(withIcon=false)=>informational?<a className="button event-register" href={event.externalUrl} target="_blank" rel="noopener noreferrer">Ir al sitio del organizador ↗</a>:registration?<a className="button event-register event-register-existing" href="/inscripciones" title="Consultar en Mis inscripciones">{registrationLabel}</a>:<button className="event-register" disabled={past||action.busy||checking||!!registrationError} onClick={register}>{withIcon&&<OutlineIcon name="edit"/>}{checking?'Consultando inscripción…':past?'Inscripciones cerradas':registrationError?'Inscripción no disponible':'Inscribirme'}</button>;
 return <article className="event-detail">
  <div className="event-detail-hero-shell"><a className="events-back event-detail-back" href="/">← Explorar eventos</a>
  <header className="event-detail-hero">
   {(event.bannerImageFileId||event.primaryImageFileId)&&<img className="event-detail-cover" src={fileUrl(event.bannerImageFileId||event.primaryImageFileId)} alt=""/>}
   <div className="event-detail-intro"><span className="event-detail-status">{informational?'EVENTO INFORMATIVO':past?'INSCRIPCIONES CERRADAS':'EVENTO PUBLICADO'}</span><h1>{event.title}</h1>
    <div className="event-detail-meta"><span><OutlineIcon name="calendar"/>{eventDate(event)}</span><span><OutlineIcon name="location"/>{event.venue||'Ubicación por confirmar'}</span>{event.discipline?.name&&<span><OutlineIcon name="sport"/>{event.discipline.name}</span>}</div>
    
   </div>
  </header>
  <div className="event-detail-actions">{registerButton(true)}<button type="button" className="secondary event-detail-share-button" aria-label="Compartir evento" title="Compartir evento" onClick={()=>setSharing(true)}><OutlineIcon name="share"/></button></div></div>
  <div className="event-detail-layout"><div className="event-detail-main">
   <Feedback state={action}/>
   {registration&&<p className="event-registration-note" role="status">{registrationLabel}. <a href="/inscripciones">Consultar en Mis inscripciones →</a></p>}
   {registrationError&&<p className="error" role="alert">{registrationError} <button className="secondary" onClick={()=>setRevision(v=>v+1)}>Reintentar</button></p>}
   <section className="event-detail-panel"><h2><OutlineIcon name="info"/>Información del evento</h2><div className="event-detail-facts">
    {event.participantCount>10&&<div><OutlineIcon name="users"/><span><strong>{event.participantCount}</strong> participantes</span></div>}
    {event.meetingAt&&<div><OutlineIcon name="users"/><span>Concentración<strong>{time(event.meetingAt)}</strong></span></div>}
    {event.timeLimitMinutes!=null&&<div><OutlineIcon name="calendar"/><span>Tiempo límite de competencia<strong>{formatTimeLimit(event.timeLimitMinutes)}</strong></span></div>}
    {startTime&&<div><OutlineIcon name="calendar"/><span>Salida<strong>{startTime}</strong></span></div>}
    {event.discipline?.name&&<div><OutlineIcon name="sport"/><span>Disciplina<strong>{event.discipline.name}</strong></span></div>}
   </div></section>
   <section className="event-detail-panel"><h2>Sobre el evento</h2><p className="preline">{event.description}</p>{informational&&<p>Evento informativo. Consulta los detalles con el organizador.</p>}</section>
   {!informational&&categories.length>0&&<section className="event-detail-panel"><h2>{event.competitionConfig?'Distancias':'Categorías'}</h2><p className="muted">Elige una categoría. La inscripción está sujeta a revisión del organizador.</p><fieldset className="event-detail-categories"><legend className="sr-only">Categoría para inscribirte</legend>{categories.map(c=><label key={c.id} className="event-detail-category"><input type="radio" name="event-category" value={c.id} checked={categoryId===c.id} disabled={past} onChange={()=>setCategory(c.id)}/><span><strong>{c.name}</strong>{c.description&&<small>{c.description}</small>}{c.capacity&&<small>Cupo: {c.capacity}</small>}</span><b>{categoryPrice(c)}</b></label>)}</fieldset></section>}
   {event.kitEnabled&&event.kitDateFrom&&event.kitDateTo&&<section className="event-detail-panel"><h2><OutlineIcon name="bag"/>Entrega de kits</h2><p>{eventDate({...event,startsAt:event.kitDateFrom,timeZone:'UTC'})}{event.kitDateFrom!==event.kitDateTo?' — '+eventDate({...event,startsAt:event.kitDateTo,timeZone:'UTC'}):''}</p><p>Horario diario: {event.kitTimeFrom} — {event.kitTimeTo}</p><p>{[event.kitVenue,event.kitAddress].filter(Boolean).join(' · ')}</p>{event.kitInstructions&&<p className="preline">{event.kitInstructions}</p>}</section>}
   {routes.length>0&&<section className="event-detail-panel"><h2><OutlineIcon name="globe"/>Rutas del evento</h2><div className="event-route-gallery">{routes.map((route,index)=><figure key={index}><a href={fileUrl(route.fileId)} target="_blank" rel="noopener noreferrer" aria-label={'Ampliar '+route.title}><img className="event-detail-route" src={fileUrl(route.fileId)} loading="lazy" alt={route.title}/></a><figcaption><h3>{route.title}</h3>{route.description&&<p>{route.description}</p>}</figcaption></figure>)}</div></section>}
   {Array.isArray(event.galleryFileIds)&&event.galleryFileIds.length>0&&<section className="event-detail-panel"><h2><OutlineIcon name="camera"/>Galería</h2><div className="event-detail-gallery">{event.galleryFileIds.map(id=><a key={id} href={fileUrl(id)} target="_blank" rel="noopener noreferrer" aria-label="Ampliar imagen del evento"><img loading="lazy" src={fileUrl(id)} alt="Imagen del evento"/></a>)}</div></section>}
   {organizer&&<section className="event-detail-panel"><h2><OutlineIcon name="users"/>Organizador</h2><p>{organizer}</p>{informational&&event.publicOrganizerPhone&&<p>Teléfono: <a href={'tel:'+event.publicOrganizerPhone.replace(/[^+\d]/g,'')}>{event.publicOrganizerPhone}</a></p>}{informational&&event.publicOrganizerEmail&&<p>Correo electrónico: <a href={'mailto:'+event.publicOrganizerEmail}>{event.publicOrganizerEmail}</a></p>}</section>}
  </div>
  <aside className="event-detail-summary" aria-label="Inscripción al evento"><div className="event-detail-price">{price?<><small>{price.label||'Inscripción'}</small><strong>{price.value}</strong></>:<strong>Evento informativo</strong>}</div>{registerButton()}<button type="button" className="secondary event-detail-share-button event-detail-mobile-share" aria-label="Compartir evento" title="Compartir evento" onClick={()=>setSharing(true)}><OutlineIcon name="share"/></button><div className="event-detail-summary-extra"><p>{eventDate(event)}</p><p>{event.venue}</p><button className="secondary" onClick={()=>setSharing(true)}>Compartir ↗</button></div></aside></div>
  {sharing&&<Modal title="Compartir evento" className="event-share-modal" onClose={()=>setSharing(false)}><div className="event-share">
   <p className="event-share-title">{event.title}</p>
   <label>Enlace del evento<input readOnly value={shareUrl} onFocus={e=>e.target.select()}/></label>
   <div className="event-share-actions" role="group" aria-label="Opciones para compartir">
    <IconAction label="Copiar enlace" icon="copy" disabled={shareAction.busy} onClick={()=>shareAction.run(()=>navigator.clipboard.writeText(shareUrl),'Enlace copiado.')}/>
    <span className="event-share-whatsapp"><IconAction label="Compartir por WhatsApp" icon="whatsapp" href={'https://wa.me/?text='+encodeURIComponent(event.title+' '+shareUrl)} target="_blank" rel="noopener noreferrer"/></span>
    {event.qrDataUrl&&<IconAction label="Descargar QR" icon="download" href={event.qrDataUrl} download={event.publicSlug+'-qr.png'}/>}
   </div>
   {event.qrDataUrl&&<figure className="event-share-qr"><img src={event.qrDataUrl} alt="QR del enlace público del evento"/><figcaption>Escanea para ver el evento</figcaption></figure>}
   <Feedback state={shareAction}/>
  </div></Modal>}
  {enrolling&&(user?<CategoryEnrollment event={event} initialCategoryId={categoryId} close={()=>{setEnrolling(false);setRevision(v=>v+1);}}/>:<GuestEnrollment event={event} initialCategoryId={categoryId} close={()=>setEnrolling(false)}/>)}
 </article>;
}
