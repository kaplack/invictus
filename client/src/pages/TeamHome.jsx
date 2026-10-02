import { userLabel } from '../helpers/user.js';
import React, { useEffect, useState } from 'react';
import { api, fileUrl } from '../services/api.js';
import { useAction } from '../hooks/data.js';
import { Heading, State, Feedback, Status, date } from '../components/UI.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import { EventForm } from '../components/EventForm.jsx';
import '../styles/team-home.css';

async function memberCount(id) {
  let offset = 0;
  do {
    const data = await api(`/teams?offset=${offset}`);
    const team = data.items.find(item => item.id === id);
    if (team) return team._count?.members ?? null;
    offset = data.nextOffset;
  } while (offset !== null);
  return null;
}
function useSummary(team) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null });
    Promise.allSettled([
      memberCount(team.id),
      api(team.capabilities.edit ? '/events/mine' : `/teams/${team.id}/events`).then(items => team.capabilities.edit ? items.filter(item => item.teamId === team.id) : items),
      team.capabilities.members ? api(`/teams/${team.id}/requests`) : Promise.resolve([]),
    ]).then(results => {
      if (!active) return;
      const value = index => results[index].status === 'fulfilled' ? results[index].value : null;
      setState({ loading: false, data: { members: value(0), events: value(1), requests: value(2) } });
    });
    return () => { active = false; };
  }, [team.id, team.capabilities.edit, team.capabilities.members, revision]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}
function Metric({ label, value, icon, href }) {
  return <a className="team-home-metric" href={href} onClick={event => { if (href === "#team-home-pending") { event.preventDefault(); const panel = document.getElementById("team-home-pending"); panel?.focus({ preventScroll: true }); panel?.scrollIntoView({ block: "nearest" }); } }}><OutlineIcon name={icon}/><span><strong>{value ?? '—'}</strong><span>{label}</span></span><span aria-hidden="true">→</span></a>;
}
export default function TeamHome({ team, user }) {
  const resource = useSummary(team), action = useAction();
  const [editing, setEditing] = useState(null);
  const root = `#/mis-teams/${team.id}`;
  const edit = event => action.run(async () => setEditing(await api(`/events/mine/${event.id}`)), '');
  const editable = event => team.capabilities.edit && event.status === 'DRAFT' && ['DRAFT', 'CHANGES_REQUESTED'].includes(event.reviewStatus);
  return <section className="team-home"><Heading eyebrow="RESUMEN DEL TEAM" title={`Hola, ${userLabel(user)}.`}><p>Esto es lo que está pasando en {team.name}.</p></Heading><Feedback state={action}/>
    {editing && <EventForm key={editing.id} endpoint="/events/mine" event={editing} close={() => setEditing(null)} saved={() => { setEditing(null); resource.reload(); }}/ >}
    <State resource={resource}>{data => {
      const events = data.events || [];
      const upcoming = events.filter(event => ['DRAFT', 'PUBLISHED'].includes(event.status) && new Date(event.startsAt).getTime() > Date.now()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
      const next = upcoming[0];
      const drafts = events.filter(editable);
      const complete = data.events !== null && data.requests !== null;
      const pending = complete ? drafts.length + data.requests.length : null;
      const partial = data.members === null || !complete;
      return <>
        {partial && <div className="team-home-warning" role="alert">No pudimos cargar todos los datos. Los valores no disponibles aparecen como —. <button className="secondary" onClick={resource.reload}>Reintentar</button></div>}
        <div className="team-home-metrics">
          <Metric label="Miembros" value={data.members} icon="users" href={`${root}/miembros`}/>
          <Metric label={team.capabilities.edit ? 'Eventos' : 'Eventos publicados'} value={data.events?.length} icon="calendar" href={`${root}/eventos`}/>
          <Metric label="Eventos próximos" value={data.events === null ? null : upcoming.length} icon="calendar" href={`${root}/eventos`}/>
          {team.capabilities.edit && <Metric label="Pendientes" value={pending} icon="note" href="#team-home-pending"/>}
        </div>
        <div className="team-home-panels">
          <section className="card team-home-panel"><div className="team-home-panel-heading"><h2>Próximo evento</h2><a href={`${root}/eventos`} className="text-link">Ver eventos →</a></div>
            {data.events === null ? <p className="muted">No se pudo consultar el próximo evento.</p> : next ? <div className="team-home-event">{next.primaryImageFileId && <img src={fileUrl(next.primaryImageFileId)} alt=""/>}<div><h3>{next.title}</h3><p><OutlineIcon name="calendar"/>{date(next.startsAt)}</p>{next.venue && <p><OutlineIcon name="location"/>{next.venue}</p>}<Status value={next.status === 'DRAFT' ? next.reviewStatus || 'DRAFT' : next.status}/><div className="actions">{editable(next) ? <button disabled={action.busy} onClick={() => edit(next)}>Continuar borrador →</button> : next.status === 'PUBLISHED' ? <a className="button" href={`#/eventos/${next.publicSlug}`}>Ver evento →</a> : <a className="button secondary" href={`${root}/eventos`}>Consultar estado →</a>}</div></div></div> : <div className="team-home-empty"><h3>No hay eventos próximos</h3><p>{team.capabilities.edit ? 'Organiza el próximo encuentro de tu equipo desde Eventos.' : 'Aquí aparecerá el próximo evento publicado del equipo.'}</p><a className="button secondary" href={`${root}/eventos`}>Ir a Eventos →</a></div>}
          </section>
          {team.capabilities.edit && <section className="card team-home-panel" id="team-home-pending" tabIndex={-1}><div className="team-home-panel-heading"><h2>Pendientes {pending !== null && pending > 0 && <span className="badge">{pending}</span>}</h2></div>
            {!complete && <p className="muted">El listado está incompleto. Reintenta la carga para consultar todos los pendientes.</p>}
            {data.requests?.length > 0 && <a className="team-home-task" href={`${root}/miembros`}><OutlineIcon name="users"/><span><strong>{data.requests.length} {data.requests.length === 1 ? 'solicitud de ingreso' : 'solicitudes de ingreso'}</strong><small>Revisa las solicitudes para incorporarse al equipo.</small></span><span aria-hidden="true">→</span></a>}
            {drafts.slice(0, 4).map(event => <button key={event.id} className="team-home-task secondary" disabled={action.busy} onClick={() => edit(event)}><OutlineIcon name="note"/><span><strong>{event.title}</strong><small>{event.reviewStatus === 'CHANGES_REQUESTED' ? 'Invictus solicita cambios. Revisa el borrador.' : 'Borrador guardado. Continúa su preparación.'}</small></span><span aria-hidden="true">→</span></button>)}
            {drafts.length > 4 && <a className="text-link" href={`${root}/eventos`}>Ver todos los borradores ({drafts.length}) →</a>}
            {complete && pending === 0 && <div className="team-home-empty"><h3>Sin pendientes por ahora</h3><p>No tienes borradores por preparar{team.capabilities.members ? ' ni solicitudes de ingreso por revisar' : ''}.</p></div>}
          </section>}
        </div>
      </>;
    }}</State>
  </section>;
}
