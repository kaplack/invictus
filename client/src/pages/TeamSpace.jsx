import { userLabel } from '../helpers/user.js';
import React, { useState } from 'react';
import { api, fileUrl } from '../services/api.js';
import { useData, useAction } from '../hooks/data.js';
import { Heading, State, Feedback } from '../components/UI.jsx';
import { TeamForm, Members } from './Teams.jsx';
import MyEvents from './MyEvents.jsx';
import TeamHome from './TeamHome.jsx';
import TeamPaymentMethods from '../components/TeamPaymentMethods.jsx';
import '../styles/team-space.css';
import TeamWorkspaceShell from '../components/TeamWorkspaceShell.jsx';
import '../styles/team-directory.css';
import '../styles/team-management.css';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
const roles = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro'
};
const policies = {
  OPEN: 'Ingreso abierto',
  APPROVAL: 'Por aprobación',
  INVITE: 'Por invitación'
};
export default function Teams({
  id,
  user,
  section = 'inicio',
  onLogout, sessionError, tab
}) {
  return id ? <Console key={id} id={id} user={user} section={section} tab={tab} onLogout={onLogout} sessionError={sessionError} /> : <Directory />;
}
function Pagination({
  offset,
  next,
  onChange
}) {
  return <div className="actions"><button className="secondary" disabled={!offset} onClick={() => onChange(offset - 20)}>Anterior</button><span>Página {offset / 20 + 1}</span><button className="secondary" disabled={next === null} onClick={() => onChange(next)}>Siguiente</button></div>;
}
function Directory() {
  const [tab, setTab] = useState('joined'),
    [query, setQuery] = useState(''),
    [offset, setOffset] = useState(0),
    [creating, setCreating] = useState(false);
  const resource = useData(tab === 'explore' ? `/teams/explore?q=${encodeURIComponent(query)}&offset=${offset}` : `/teams?offset=${offset}`),
    invites = useData('/teams/invitations'),
    action = useAction();
  const refresh = () => {
    resource.reload();
    invites.reload();
  };
  return <section className="teams-page team-directory"><Heading eyebrow="CUENTA" title="Teams"><p>Encuentra tu comunidad o crea un equipo para organizar eventos.</p></Heading>
 <div className="team-toolbar"><div className="actions">{[['joined', 'Perteneces'], ['explore', 'Explorar']].map(([value, label]) => <button key={value} className="secondary" aria-pressed={tab === value} onClick={() => {
          setTab(value);
          setOffset(0);
        }}><OutlineIcon name={value === 'joined' ? 'users' : 'location'}/>{label}</button>)}</div><button className="team-create" onClick={() => setCreating(true)}>＋ Crear Team</button></div>
 {creating && <TeamForm team={{}} close={() => setCreating(false)} saved={team => {
      setCreating(false);
      location.hash = `/mis-teams/${team.id}`;
    }} />}<Feedback state={action} />
 <State resource={invites}>{items => items.length > 0 && <section className="card"><h2>Invitaciones</h2>{items.map(i => <div className="team-invitation" key={i.id}><strong>{i.team.name}</strong><div className="actions">{[true, false].map(accept => <button key={String(accept)} className={accept ? undefined : "secondary"} disabled={action.busy} onClick={() => action.run(async () => {
              await api(`/teams/${i.team.id}/admissions/${i.id}`, 'POST', {
                accept
              });
              refresh();
            }, accept ? 'Ahora perteneces al Team.' : 'Invitación rechazada.')}>{accept ? 'Aceptar' : 'Rechazar'}</button>)}</div></div>)}</section>}</State>
 {tab === 'explore' && <label className="team-search">Buscar Team<input type="search" maxLength={120} value={query} placeholder="Nombre del equipo" onChange={e => {
        setQuery(e.target.value);
        setOffset(0);
      }} /></label>}
 <section className="team-directory-panel"><h2>{tab === 'joined' ? 'Tus Teams' : 'Explorar Teams'}</h2><State resource={resource}>{data => <><p className="team-directory-count">{data.items.length} {data.items.length === 1 ? 'Team' : 'Teams'} en esta página</p>{data.items.length ? <div className="team-grid">{data.items.map(team => {
            const joined = tab === 'joined' || team.members?.length > 0,
              pending = team.admissions?.some(a => a.status === 'PENDING');
            return <article className="card team-card" key={team.id}><div className="team-card-banner" aria-hidden="true">{team.bannerFileId && <img src={fileUrl(team.bannerFileId)} alt="" loading="lazy"/>}</div><div className="team-card-main"><div className="team-identity">{team.logoFileId ? <img src={fileUrl(team.logoFileId)} alt="" /> : <span className="team-monogram" aria-hidden="true">{team.name.slice(0, 1)}</span>}<h2>{team.name}</h2></div><p>{team.description || 'Un espacio para compartir desafíos y organizar eventos.'}</p><span className="badge">{joined ? roles[team.role || team.members[0].role] : policies[team.joinPolicy]}</span><div className="actions team-card-actions">{joined ? <a className="button" href={`#/mis-teams/${team.id}`}>{['OWNER', 'ADMIN'].includes(team.role || team.members?.[0]?.role) ? 'Gestionar' : 'Entrar'}</a> : pending ? <span role="status">Ingreso pendiente</span> : team.joinPolicy === 'INVITE' ? <span>Solo por invitación</span> : <button disabled={action.busy} onClick={() => action.run(async () => {
                  const result = await api(`/teams/${team.id}/join`, 'POST', {});
                  if (result.status === 'ACCEPTED') location.hash = `/mis-teams/${team.id}`;else refresh();
                }, 'Solicitud enviada al equipo.')}>{team.joinPolicy === 'OPEN' ? 'Unirse' : 'Solicitar ingreso'}</button>}</div><div className="team-card-stats"><div><OutlineIcon name="users"/><span><strong>{team._count?.members ?? '—'}</strong>Miembros</span></div><div><OutlineIcon name="calendar"/><span><strong>{team._count?.events ?? '—'}</strong>Eventos publicados</span></div><div title="Los resultados todavía no están disponibles"><OutlineIcon name="note"/><span><strong>—</strong>Resultados</span></div></div></div></article>;
          })}</div> : <div className="empty"><h2>{tab === 'joined' ? 'Tu próximo desafío empieza con un equipo.' : 'No encontramos equipos.'}</h2><p>{tab === 'joined' ? 'Crea un Team, explora la comunidad o acepta una invitación.' : 'Prueba otro nombre. Solo aparecen equipos visibles.'}</p>{tab === 'joined' && <button className="secondary" onClick={() => {
            setTab('explore');
            setOffset(0);
          }}>Explorar Teams</button>}</div>}{(offset > 0 || data.nextOffset !== null) && <Pagination offset={offset} next={data.nextOffset} onChange={setOffset} />}</>}</State></section></section>;
}
function Console({ id, user, section, onLogout, sessionError, tab }) {
  const resource = useData(`/teams/${id}`);
  return <><a className="skip" href="#main" onClick={e => {
      e.preventDefault();
      document.getElementById('main')?.focus();
    }}>Ir al contenido</a>{resource.error && <a className="button secondary" href="#/mis-teams">Volver a Teams</a>}<State resource={resource}>{team => {
        const links = [['inicio', 'Inicio'], ['comunicados', 'Comunicados'], ['eventos', 'Eventos'], ['miembros', 'Miembros'], ...(team.capabilities.edit ? [['cobros', 'Métodos de cobro'], ['configuracion', 'Configuración']] : [])];
        return <TeamWorkspaceShell team={team} user={user} section={section} onLogout={onLogout} sessionError={sessionError}>{!team.active && <p className="error">Este Team está inactivo. Las herramientas de gestión no están disponibles.</p>}
 {!links.some(([key]) => key === section) ? <div className="empty">Esta sección no está disponible con tus permisos. <a className="text-link" href={`#/mis-teams/${id}`}>Volver a Inicio</a></div> : section === 'inicio' ? <TeamHome team={team} user={user}/> : section === 'comunicados' ? <><Heading title="Comunicados" /><div className="empty"><span className="badge">Próximamente</span><h2>Las novedades del equipo, en un solo lugar.</h2><p>Aquí podrás consultar los comunicados de {team.name}.</p></div></> : section === 'eventos' ? team.capabilities.edit ? <MyEvents team={team} /> : <MemberEvents team={team} /> : section === 'miembros' ? <MembersPage team={team} user={user} reload={resource.reload} tab={tab}/> : <Settings team={team} reload={resource.reload} tab={section === 'cobros' ? 'cobros' : tab}/> }
 </TeamWorkspaceShell>;
      }}</State></>;
}
function MemberEvents({
  team
}) {
  const resource = useData(`/teams/${team.id}/events`);
  return <><Heading title="Eventos"><p>Eventos publicados por el equipo.</p></Heading><State resource={resource}>{items => items.length ? <div className="team-grid">{items.map(e => <article className="card" key={e.id}><h2>{e.title}</h2><a className="button secondary" href={`#/eventos/${e.publicSlug}`}>Ver evento</a></article>)}</div> : <p className="empty">El equipo todavía no tiene eventos publicados.</p>}</State></>;
}
function Settings({
  team,
  reload, tab
}) {
  const current = ['acceso', 'cobros'].includes(tab) ? tab : 'perfil';
  const [editing, setEditing] = useState(false),
    action = useAction();
  return <section className="team-settings"><Heading title="Configuración"><p>Define la identidad, el acceso y los medios de cobro de tu equipo.</p></Heading>
    <SectionLinks label="Configuración" items={[['perfil','Perfil'],['acceso','Acceso'],['cobros','Métodos de cobro']]} current={current} root={`#/mis-teams/${team.id}/configuracion`}/>{current === 'cobros' && <TeamPaymentMethods team={team}/>}
    {current === 'perfil' && <div className="team-settings-grid"><section className="card team-profile-panel"><div className="team-panel-heading"><h2>Perfil del Team</h2><button className="secondary" onClick={() => setEditing(true)}>Editar Team</button></div>
      <div className="team-settings-identity">{team.logoFileId ? <img src={fileUrl(team.logoFileId)} alt="Logo del Team"/> : <span className="workspace-monogram" aria-hidden="true">{team.name.slice(0,1)}</span>}<div><h3>{team.name}</h3><p className="muted">{team.disciplines?.map(item => item.name).join(' · ') || 'Sin deportes seleccionados'}</p></div></div>
      <p className="team-description">{team.description || 'Agrega una descripción para presentar al equipo.'}</p>
      <dl className="team-settings-details"><div><dt>Banner público</dt><dd>{team.bannerFileId ? 'Configurado · Puedes revisarlo en Editar Team' : 'Sin banner'}</dd></div><div><dt>Persona de contacto</dt><dd>{team.contactName || 'Sin registrar'}</dd></div><div><dt>Correo de contacto</dt><dd>{team.email || 'Sin registrar'}</dd></div><div><dt>Teléfono / WhatsApp</dt><dd>{[team.phone, team.whatsapp].filter(Boolean).join(' / ') || 'Sin registrar'}</dd></div></dl>
      <small>Los datos de contacto permanecen dentro del equipo.</small>
    </section><div className="team-settings-side"><section className="card"><h2>Roles y permisos</h2><p>Propietarios: administran miembros, acceso, cobros, perfil y eventos.</p><p>Administradores: editan el perfil y gestionan eventos.</p><p>Miembros: consultan el equipo y sus eventos publicados.</p><a className="text-link" href={`#/mis-teams/${team.id}/miembros`}>{team.capabilities.members ? 'Gestionar miembros y roles →' : 'Ver miembros →'}</a></section></div></div>}
    {editing && <TeamForm team={team} close={() => setEditing(false)} saved={() => {
      setEditing(false);
      reload();
    }} />}{current === 'acceso' && team.role === 'OWNER' && <form className="card form team-access" onSubmit={e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      action.run(async () => {
        await api(`/teams/${team.id}`, 'PATCH', {
          joinPolicy: data.get('joinPolicy'),
          discoverable: data.has('discoverable')
        });
        reload();
      }, 'Acceso actualizado.');
    }}><h2>Acceso al equipo</h2><label>Modalidad de ingreso<select name="joinPolicy" defaultValue={team.joinPolicy} disabled={action.busy}>{Object.entries(policies).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><p className="muted">Abierto: ingreso inmediato. Por aprobación: un propietario revisa la solicitud. Por invitación: la persona debe recibir y aceptar una invitación.</p><label className="check"><input type="checkbox" name="discoverable" defaultChecked={team.discoverable} disabled={action.busy} />Mostrar en Explorar Teams</label><small>Se mostrarán el nombre, logo, descripción y modalidad de ingreso. Los datos de contacto y la gestión permanecen dentro del equipo.</small><button disabled={action.busy}>{action.busy ? 'Guardando…' : 'Guardar acceso'}</button><Feedback state={action} /></form>}{current === 'acceso' && team.role !== 'OWNER' && <section className="card team-access"><h2>Acceso al equipo</h2><p>{policies[team.joinPolicy]} · {team.discoverable ? 'Visible en Explorar Teams' : 'No aparece en Explorar Teams'}</p><p className="muted">Solo los propietarios pueden modificar estas opciones.</p></section>}</section>;
}
function Requests({ team, reload, resource }) {
  const action = useAction();
  return <section className="card team-requests"><h2>Solicitudes de ingreso</h2><p className="muted">Decide quién se incorpora al equipo. Las invitaciones se aceptan desde la cuenta de cada persona.</p><Feedback state={action} /><State resource={resource}>{items => items.length ? items.map(i => <div className="card team-invitation" key={i.id}><strong>{userLabel(i.user)}</strong><div className="actions">{[true, false].map(accept => <button key={String(accept)} className="secondary" disabled={action.busy} onClick={() => action.run(async () => {
            await api(`/teams/${team.id}/admissions/${i.id}`, 'POST', {
              accept
            });
            resource.reload();
            reload();
          }, accept ? 'Miembro incorporado.' : 'Solicitud rechazada.')}>{accept ? 'Aprobar' : 'Rechazar'}</button>)}</div></div>) : <p className="muted">No hay solicitudes pendientes.</p>}</State></section>;
}

function SectionLinks({label,items,current,root}) {
  return <nav className="team-section-links" aria-label={label}>{items.map(([key,text]) => <a key={key} href={root+'/'+key} aria-current={current === key ? 'page' : undefined}>{text}</a>)}</nav>;
}
function MembersPage({team,user,reload,tab}) {
  return team.capabilities.members ? <ManagedMembers team={team} user={user} reload={reload} tab={tab}/> : <Members team={team} user={user} reloadTeam={reload}/>;
}
function ManagedMembers({team,user,reload,tab}) {
  const requests = useData('/teams/'+team.id+'/requests');
  const current = tab === 'solicitudes' ? tab : 'integrantes';
  return <Members team={team} user={user} reloadTeam={reload} showList={current === 'integrantes'}>
    <SectionLinks label="Miembros" items={[['integrantes','Integrantes'],['solicitudes','Solicitudes'+(!requests.loading && !requests.error ? ' ('+requests.data.length+')' : '')]]} current={current} root={'#/mis-teams/'+team.id+'/miembros'}/>
    {current === 'solicitudes' && <Requests team={team} reload={reload} resource={requests}/>}
  </Members>;
}
