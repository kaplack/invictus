import React from 'react';
import {fileUrl} from '../services/api.js';
import {OutlineIcon} from './OutlineIcon.jsx';
import {labels} from './UI.jsx';

export function eventPrice(event) {
 if(event.mode==='INFORMATIONAL')return null;
 const categories=event.categories||[],configuration=event.registrationConfigEventRows?.[0];
 const paid=categories.filter(c=>c.priceCents>0).sort((a,b)=>a.priceCents-b.priceCents);
 if(categories.length&&!paid.length)return {label:null,value:'Gratis'};
 const amount=categories.length?paid[0]?.priceCents:configuration?.amountCents;
 if(!amount)return {label:null,value:'Gratis'};
 return {label:categories.some(c=>c.priceCents===0)?'Gratis / desde':'Desde',value:new Intl.NumberFormat('es-PE',{style:'currency',currency:categories.length?paid[0].currency:configuration.currency}).format(amount/100)};
}
export function eventDate(event){
 if(!event.startsAt)return 'Fecha por definir';
 const parts=new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric',timeZone:event.timeZone||'America/Lima'}).formatToParts(new Date(event.startsAt));
 return ['day','month','year'].map(type=>parts.find(part=>part.type===type).value.replace(/\./g,'')).join(' ').toLocaleUpperCase('es');
}
export function EventCards({events}) {
 return <div className="grid">{events.map(event=>{
  const price=eventPrice(event),count=event.participantCount;
  const badge=event.mode==='INFORMATIONAL'?'INFORMATIVO':(labels[event.status]||'Publicado').toLocaleUpperCase('es');
  return <article className="card event-card" key={event.id}>
   <div className="event-cover">{event.primaryImageFileId?<img src={fileUrl(event.primaryImageFileId)} alt="" loading="lazy"/>:<span aria-hidden="true"><OutlineIcon name="calendar"/></span>}<b>{badge}</b></div>
   <div className="event-card-content">
    <p className="event-card-date"><OutlineIcon name="calendar"/><time dateTime={event.startsAt||undefined}>{eventDate(event)}</time></p>
    <h2>{event.title}</h2>
    <div className="event-card-metadata"><span><OutlineIcon name="location"/>{event.venue||'Ubicación por confirmar'}</span>{event.discipline?.name&&<span><OutlineIcon name="sport"/>{event.discipline.name}</span>}</div>
    {typeof count==='number'&&Number.isFinite(count)&&count>10&&<p className="event-card-participants"><OutlineIcon name="users"/>{count} participantes</p>}
    <div className="event-card-footer"><div className="event-card-price">{price?<>{price.label&&<small>{price.label}</small>}<strong>{price.value}</strong></>:<small>Evento informativo</small>}</div><a className="button event-card-link" href={'/eventos/'+event.publicSlug} aria-label={'Ver evento: '+event.title}>Ver evento <span aria-hidden="true">↗</span></a></div>
   </div>
  </article>;
 })}</div>;
}
