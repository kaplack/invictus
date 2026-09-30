import React, { useState } from 'react';
import { api, fileUrl } from '../services/api.js';
import { useData, useAction } from '../hooks/data.js';
import { Heading, State, Feedback, Records, Status, date } from '../components/UI.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import { EventForm } from '../components/EventForm.jsx';
import { EventSetup } from '../components/EventSetup.jsx';
import { Attendees } from './Manage.jsx';
import '../styles/team-events.css';

export default function MyEvents({ team }) {
  const resource = useData('/events/mine'), action = useAction();
  const [setup, setSetup] = useState(null), [editing, setEditing] = useState(null), [attendees, setAttendees] = useState(null);
  function actions(event) {
    const editable = event.status === 'DRAFT' && ['DRAFT', 'CHANGES_REQUESTED'].includes(event.reviewStatus);
    return <div className="team-event-actions">
      <div className="team-event-secondary">
        {editable && <button className="secondary" disabled={action.busy} onClick={() => action.run(async () => setEditing(await api('/events/mine/' + event.id)), '')}>Editar</button>}
        {event.teamId && <button className="secondary" onClick={() => setSetup(event)}>Categorías y pagos</button>}
        <button className="secondary" onClick={() => setAttendees(event)}>Participantes</button>
        {event.status === 'PUBLISHED' && <a className="text-link" href={`#/eventos/${event.publicSlug}`}>Ver evento ↗</a>}
      </div>
      {editable && (event.source === 'EXTERNAL' ? <button className="team-event-submit" disabled={action.busy || !!editing} onClick={() => action.run(async () => { await api(`/events/mine/${event.id}/submit`, 'POST', {}); resource.reload(); }, 'Evento enviado a Invictus. Puedes consultar aquí el resultado de la revisión.')}>Enviar a revisión →</button> : <small>Publicación desde Gestión de Invictus</small>)}
      {event.reviewStatus === 'PENDING_REVIEW' && <small>Esperando revisión de Invictus</small>}
    </div>;
  }
  return <section className="team-events">
    <div className="team-events-header"><Heading eyebrow={team?.name || 'TEAMS'} title="Eventos"><p>Organiza los eventos de tu equipo y consulta su estado.</p></Heading><button onClick={() => setEditing(team ? { teamId: team.id, team } : {})}>Crear evento +</button></div>
    <p className="muted">Guarda un borrador, completa sus datos y envíalo a revisión. Invictus revisará el evento antes de publicarlo.</p>
    <Feedback state={action}/>
    {setup && <EventSetup event={setup} close={() => setSetup(null)}/>}
    {editing && <EventForm key={editing.id || 'new'} endpoint="/events/mine" event={editing} close={() => setEditing(null)} saved={() => { setEditing(null); resource.reload(); }}/>}
    <State resource={resource}>{allEvents => {
      const events = team ? allEvents.filter(event => event.teamId === team.id) : allEvents;
      return events.length ? <section className="team-events-panel" aria-label="Eventos del equipo"><p className="muted team-events-count">{events.length} {events.length === 1 ? 'evento' : 'eventos'}</p><Records items={events} columns={[
        { label: 'Evento', render: event => <><div className="team-event-identity">{event.primaryImageFileId ? <img src={fileUrl(event.primaryImageFileId)} alt="" loading="lazy"/> : <span className="team-event-placeholder" aria-hidden="true"><OutlineIcon name="calendar"/></span>}<div><strong>{event.title}</strong>{event.venue && <small>{event.venue}</small>}</div></div>{event.reviewNote && <p className="team-event-review"><strong>Observaciones de Invictus:</strong> {event.reviewNote}</p>}</> },
        ...(!team ? [{ label: 'Team organizador', render: event => event.team?.name || 'Pendiente de asignación' }] : []),
        { label: 'Fecha', render: event => <span className="team-event-date"><OutlineIcon name="calendar"/>{date(event.startsAt)}</span> },
        { label: 'Estado', render: event => <Status value={event.status === 'DRAFT' ? event.reviewStatus || 'DRAFT' : event.status}/> },
      ]} actions={actions}/></section> : <div className="empty"><h2>Tu próximo evento empieza aquí</h2><p>Este equipo todavía no tiene eventos. Usa «Crear evento» para guardar el primer borrador.</p></div>;
    }}</State>
    {attendees && <Attendees key={attendees.id} event={attendees} endpoint="/events/mine" close={() => setAttendees(null)}/>}
  </section>;
}
