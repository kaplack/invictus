import {visibleCapabilities} from '../app/capabilities.js';
import {navigate} from '../services/navigation.js';
import {IconAction} from '../components/IconAction.jsx';
import React, { useState, useEffect } from 'react';
import { api, fileUrl } from '../services/api.js';
import { useData, useAction } from '../hooks/data.js';
import { Heading, State, Feedback, Records, Status, date } from '../components/UI.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import { EventForm } from '../components/EventForm.jsx';
import { EventSetup } from '../components/EventSetup.jsx';
import '../styles/team-events.css';

export default function MyEvents({ team }) {
  const resource = useData('/events/mine'), action = useAction();
  const [setup, setSetup] = useState(null), [editing, setEditing] = useState(null);
  function createEvent() {
    if(team){setEditing({teamId:team.id,team});return;}
    action.run(async()=>{
      const profile=await api('/profile');
      if(!profile?.name?.trim()||!profile?.lastName?.trim()||profile.documentType!=='DNI'||!/^\d{8}$/.test(profile.documentNumber||'')||!profile.phone){navigate('/perfil?continuar=crear-evento');return;}
      navigate('/mis-eventos/nuevo');
    },'');
  }
  useEffect(()=>{if(new URLSearchParams(location.search).get('crear')==='1'){navigate('/mis-eventos',{replace:true});createEvent();}},[]);
  function actions(event) {
    const editable = !event.teamId ? ['DRAFT','PUBLISHED'].includes(event.status) : event.status === 'DRAFT' && ['DRAFT', 'CHANGES_REQUESTED'].includes(event.reviewStatus);
    return <div className="team-event-actions event-icon-actions">

        {editable && <IconAction label={event.status==='DRAFT'?'Continuar edición':'Editar'} icon="edit" disabled={action.busy} onClick={() => event.teamId ? action.run(async () => setEditing(await api('/events/mine/' + event.id)), '') : navigate('/mis-eventos/'+event.id+'/editar')}/>}
        {event.mode!=='INFORMATIONAL' && <IconAction label="Categorías y pagos" icon="settings" onClick={() => event.teamId ? setSetup(event) : navigate('/mis-eventos/'+event.id+'/editar?paso=2')}/>}
        <IconAction label="Participantes" icon="users" href={`/mis-eventos/${event.id}/inscripciones`}/>
        {event.status === 'PUBLISHED' && <IconAction label="Ver evento" icon="external" href={`/eventos/${event.publicSlug}`}/>}
      {!event.teamId && ['DRAFT','PUBLISHED'].includes(event.status) && <IconAction label={event.status==='PUBLISHED'?'Despublicar':'Publicar'} icon={event.status==='PUBLISHED'?'unpublish':'publish'} disabled={action.busy || !!editing || !!event.lifecycle?.publicationBlockReason} onClick={() => action.run(async () => { await api('/events/mine/'+event.id+(event.status==='PUBLISHED'?'/unpublish':'/publish'),'POST',{}); resource.reload(); }, event.status==='PUBLISHED'?'Evento despublicado.':'Evento publicado.')}/>}
      {event.teamId && editable && (event.source === 'EXTERNAL' ? <button className="team-event-submit" disabled={action.busy || !!editing} onClick={() => action.run(async () => { await api(`/events/mine/${event.id}/submit`, 'POST', {}); resource.reload(); }, 'Evento enviado a Invictus. Puedes consultar aquí el resultado de la revisión.')}>Enviar a revisión →</button> : <small>Publicación desde Gestión de Invictus</small>)}
      {!event.teamId&&event.lifecycle?.publicationBlockReason&&<small>{event.lifecycle.publicationBlockReason}</small>}
      {event.reviewStatus === 'PENDING_REVIEW' && <small>Esperando revisión de Invictus</small>}
    </div>;
  }
  return <section className={team ? "team-events" : "team-events personal-events"}>
    <div className="team-events-header"><Heading title={team ? 'Eventos' : 'Mis eventos'}><p>{team ? 'Organiza los eventos de tu equipo y consulta su estado.' : 'Crea un evento con tu cuenta personal y consulta sus inscritos.'}</p></Heading><button disabled={action.busy} onClick={createEvent}>Crear evento +</button></div>
    <p className="muted">Guarda un borrador y publica tu evento cuando esté listo.</p>
    <Feedback state={action}/>
    {setup && <EventSetup event={setup} close={() => setSetup(null)}/>}
    {editing && <EventForm key={editing.id || 'new'} endpoint="/events/mine" event={editing} close={() => setEditing(null)} saved={() => { setEditing(null); resource.reload(); }}/>}
    <State resource={resource}>{allEvents => {
      const events = team ? allEvents.filter(event => event.teamId === team.id) : allEvents.filter(event=>visibleCapabilities.teams || !event.teamId);
      return events.length ? <section className="team-events-panel" aria-label="Eventos del equipo"><p className="muted team-events-count">{events.length} {events.length === 1 ? 'evento' : 'eventos'}</p><Records items={events} columns={[
        { label: 'Evento', render: event => <><div className="team-event-identity">{event.primaryImageFileId ? <img src={fileUrl(event.primaryImageFileId)} alt="" loading="lazy"/> : <span className="team-event-placeholder" aria-hidden="true"><OutlineIcon name="calendar"/></span>}<div><strong>{event.title}</strong>{event.venue && <small>{event.venue}</small>}</div></div>{event.reviewNote && <p className="team-event-review"><strong>Observaciones de Invictus:</strong> {event.reviewNote}</p>}</> },
        ...(!team ? [{ label: 'Organización', render: event => event.team?.name || 'Personal' }] : []),
        { label: 'Fecha', render: event => <span className="team-event-date"><OutlineIcon name="calendar"/>{date(event.startsAt)}</span> },
        { label: 'Estado', render: event => <><Status value={event.status === 'DRAFT' ? event.reviewStatus || 'DRAFT' : event.status} label={event.lifecycle?.displayLabel}/>{event.lifecycle?.started&&<small>Fecha de inicio alcanzada</small>}</> },
      ]} actions={actions}/></section> : <div className="empty"><h2>Tu próximo evento empieza aquí</h2><p>Usa «Crear evento» para guardar tu primer borrador.</p></div>;
    }}</State>
  </section>;
}
