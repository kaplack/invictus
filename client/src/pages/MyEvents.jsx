import {ActionIcon} from '../components/Modal.jsx';
import React,{useState} from 'react';
import {api} from '../services/api.js';
import {useData,useAction} from '../hooks/data.js';
import {Heading,State,Feedback,Records,Status,date} from '../components/UI.jsx';
import {EventForm,Attendees} from './Manage.jsx';
export default function MyEvents() {
 const r=useData('/events/mine'),a=useAction(),[editing,setEditing]=useState(null),[attendees,setAttendees]=useState(null);
 return <><Heading eyebrow="MI CUENTA" title="Mis eventos"><p>Crea tu evento y envíalo a Invictus para su aprobación. Puedes organizar eventos y seguir participando como nadador.</p></Heading>
 <button onClick={()=>setEditing({})}>Crear evento +</button>
 <p className="muted">Guarda un borrador, completa sus datos y envíalo a revisión. Solo se publicará cuando Invictus lo apruebe.</p>
 <Feedback state={a}/>
 {editing&&<EventForm key={editing.id||'new'} endpoint="/events/mine" event={editing} close={()=>setEditing(null)} saved={()=>{setEditing(null);r.reload();}}/>}
 <State resource={r}>{events=>events.length?<Records items={events} columns={[
 {label:'Evento',render:e=><>{e.title}{e.reviewNote&&<p className="muted"><strong>Observaciones de Invictus:</strong> {e.reviewNote}</p>}</>},
 {label:'Fecha',render:e=>date(e.startsAt)},
 {label:'Estado',render:e=><Status value={e.status==='DRAFT'?e.reviewStatus:e.status}/>}]} actions={event=><>
 {event.status==='DRAFT'&&['DRAFT','CHANGES_REQUESTED'].includes(event.reviewStatus)&&<>
 <button className="secondary icon-action" aria-label="Editar borrador" title="Editar borrador" disabled={a.busy} onClick={()=>a.run(async()=>setEditing(await api('/events/mine/'+event.id)),'')}><ActionIcon name="edit"/></button>
 <button disabled={a.busy||!!editing} onClick={()=>a.run(async()=>{await api(`/events/mine/${event.id}/submit`,'POST',{});r.reload();},'Evento enviado a Invictus. Puedes consultar aquí el resultado de la revisión.')}>Enviar a revisión</button></>}
 {event.reviewStatus==='PENDING_REVIEW'&&<span className="muted">Esperando revisión de Invictus</span>}
 {event.status==='PUBLISHED'&&<a className="button secondary icon-action" aria-label="Ver evento" title="Ver evento" href={'#/eventos/'+event.publicSlug}><ActionIcon name="view"/></a>}
 <button className="secondary icon-action" aria-label="Ver inscritos" title="Ver inscritos" onClick={()=>setAttendees(event)}><ActionIcon name="people"/></button>
 </>}/>:<div className="empty"><p>Todavía no has creado eventos.</p><p>Empieza con «Crear evento» y guarda tu primer borrador.</p></div>}</State>{attendees&&<Attendees key={attendees.id} event={attendees} endpoint="/events/mine" close={()=>setAttendees(null)}/>}</>;
}
