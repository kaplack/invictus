import React, { useEffect, useState } from 'react';
import { useAction, useData } from '../hooks/data.js';
import { Field, Textarea, Heading, State, Feedback, Records } from '../components/UI.jsx';
import { Modal } from '../components/Modal.jsx';
import { fileUrl } from '../services/api.js';
import { saveTeam, addMember, changeMemberRole, removeMember } from '../services/teams.js';
import '../styles/teams.css';

const roles = { OWNER: 'Propietario', ADMIN: 'Administrador', MEMBER: 'Miembro' };
function RoleOptions() { return Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>); }
function Pagination({ offset, next, setOffset }) {
  return <nav className="actions team-pagination" aria-label="Páginas del listado">
    <button className="secondary" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20))}>Anterior</button>
    <span>Página {offset / 20 + 1}</span>
    <button className="secondary" disabled={next === null} onClick={() => setOffset(next)}>Siguiente</button>
  </nav>;
}
export default function Teams({ id, user }) { return id ? <TeamDetail key={id} id={id} user={user}/> : <TeamList/>; }

function TeamList() {
  const [offset, setOffset] = useState(0), [creating, setCreating] = useState(false);
  const resource = useData(`/teams?offset=${offset}`);
  return <section className="teams-page">
    <Heading eyebrow="MI CUENTA" title="Mis Teams"><p>Organiza tu comunidad y comparte la gestión con tu equipo.</p></Heading>
    <button onClick={() => setCreating(true)}>Crear Team</button>
    {creating && <TeamForm team={{}} close={() => setCreating(false)} saved={team => { setCreating(false); location.hash = `/mis-teams/${team.id}`; }}/ >}
    <State resource={resource}>{data => <>
      {!data.items.length ? <div className="empty"><h2>Tu próximo evento empieza con un equipo.</h2><p>Crea tu primer Team o pide a su propietario que te agregue con el correo de tu cuenta.</p></div> :
        <Records items={data.items} columns={[
          { label: 'Team', render: team => <div className="team-identity">{team.logoFileId && <img src={fileUrl(team.logoFileId)} alt=""/>}<strong>{team.name}</strong></div> },
          { label: 'Tu rol', render: team => <span className="badge">{roles[team.role]}</span> },
          { label: 'Estado', render: team => team.active ? 'Activo' : 'Inactivo' },
        ]} actions={team => <a className="button secondary" href={`#/mis-teams/${team.id}`}>Entrar al Team</a>}/>}
      {(offset > 0 || data.nextOffset !== null) && <Pagination offset={offset} next={data.nextOffset} setOffset={setOffset}/>}
    </>}</State>
  </section>;
}

function TeamDetail({ id, user }) {
  const resource = useData(`/teams/${id}`), [editing, setEditing] = useState(false);
  return <section className="teams-page"><a href="#/mis-teams">← Mis Teams</a>
    <State resource={resource}>{team => <>
      <Heading eyebrow={`TEAM · ${roles[team.role]}`} title={team.name}/>
      <div className="card team-summary">
        {team.logoFileId && <img className="team-logo" src={fileUrl(team.logoFileId)} alt={`Logo de ${team.name}`}/>}
        <div><p className="team-description">{team.description || 'Este Team todavía no tiene una descripción.'}</p>
          <dl className="team-contact">{[['Contacto', team.contactName], ['Teléfono', team.phone], ['WhatsApp', team.whatsapp], ['Correo', team.email]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {!team.active && <p>Este Team está inactivo. Su gestión no está disponible.</p>}
          {team.capabilities.edit && <button className="secondary" onClick={() => setEditing(true)}>Editar Team</button>}
          {team.capabilities.edit && <p><a className="text-link" href="#/mis-eventos">Administrar mis eventos</a></p>}
        </div>
      </div>
      {editing && <TeamForm team={team} close={() => setEditing(false)} saved={() => { setEditing(false); resource.reload(); }}/ >}
      <Members team={team} user={user} reloadTeam={resource.reload}/>
    </>}</State>
  </section>;
}

function TeamForm({ team, close, saved }) {
  const action = useAction(), [logo, setLogo] = useState(null), [removeLogo, setRemoveLogo] = useState(false), [preview, setPreview] = useState(null);
  useEffect(() => { if (!logo) { setPreview(null); return; } const url = URL.createObjectURL(logo); setPreview(url); return () => URL.revokeObjectURL(url); }, [logo]);
  return <Modal title={team.id ? 'Editar Team' : 'Crear Team'} onClose={close} busy={action.busy}>
    <form className="form" onSubmit={event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
      if (removeLogo) values.logoFileId = null;
      action.run(async () => {
        if (logo && logo.size > 10 * 1024 * 1024) throw new Error('El logo debe pesar como máximo 10 MB.');
        saved(await saveTeam(team, values, logo));
      });
    }}>
      <Field label="Nombre del Team (obligatorio)" name="name" defaultValue={team.name} maxLength={120} required/>
      <Textarea label="Descripción (opcional)" name="description" defaultValue={team.description} maxLength={2000}/>
      <div className="form-grid">
        <Field label="Persona de contacto (opcional)" name="contactName" defaultValue={team.contactName || ''} maxLength={120}/>
        <Field label="Correo de contacto (opcional)" name="email" type="email" defaultValue={team.email || ''} maxLength={254}/>
        <Field label="Teléfono (opcional)" name="phone" type="tel" defaultValue={team.phone || ''} maxLength={40}/>
        <Field label="WhatsApp (opcional)" name="whatsapp" type="tel" defaultValue={team.whatsapp || ''} maxLength={40}/>
      </div>
      <label>Logo público (opcional) · PNG, JPG o WebP, hasta 10 MB<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { setLogo(event.target.files[0] || null); setRemoveLogo(false); }}/></label>
      {(preview || (team.logoFileId && !removeLogo)) && <img className="team-logo" src={preview || fileUrl(team.logoFileId)} alt="Vista previa del logo"/>}
      {team.logoFileId && <label className="check"><input type="checkbox" checked={removeLogo} disabled={!!logo} onChange={event => setRemoveLogo(event.target.checked)}/>Quitar el logo actual</label>}
      {!team.id && <p>Serás el propietario del Team. Podrás agregar a otras personas registradas en Invictus.</p>}
      <Feedback state={action}/><div className="actions"><button disabled={action.busy}>{action.busy ? 'Guardando…' : team.id ? 'Guardar cambios' : 'Crear Team'}</button><button type="button" className="secondary" disabled={action.busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}

function Members({ team, user, reloadTeam }) {
  const [offset, setOffset] = useState(0), [adding, setAdding] = useState(false), [editing, setEditing] = useState(null);
  const resource = useData(`/teams/${team.id}/members?offset=${offset}`), action = useAction();
  function refresh() { resource.reload(); reloadTeam(); }
  return <section className="team-members"><h2>Miembros</h2>
    <p>Los propietarios administran miembros. Los administradores pueden editar la información del Team.</p>
    {team.capabilities.members && <button onClick={() => setAdding(true)}>Agregar miembro</button>}
    <Feedback state={action}/>
    <State resource={resource}>{data => <>
      <Records items={data.items} columns={[
        { label: 'Nombre', render: member => `${member.user.name} ${member.user.lastName}${member.userId === user.id ? ' (tú)' : ''}` },
        { label: 'Rol', render: member => <span className="badge">{roles[member.role]}</span> },
      ]} actions={team.capabilities.members ? member => <>
        <button className="secondary" disabled={action.busy} onClick={() => setEditing(member)}>Cambiar rol</button>
        <button className="danger" disabled={action.busy} onClick={() => {
          if (confirm(`¿Quitar a ${member.user.name} de este Team? Perderá su acceso.`)) action.run(async () => {
            await removeMember(team.id, member.id);
            if (member.userId === user.id) location.hash = '/mis-teams';
            else { if (data.items.length === 1 && offset) setOffset(offset - 20); refresh(); }
          }, 'Miembro eliminado.');
        }}>Quitar</button>
      </> : undefined}/>
      {(offset > 0 || data.nextOffset !== null) && <Pagination offset={offset} next={data.nextOffset} setOffset={setOffset}/>}
    </>}</State>
    {(adding || editing) && <MemberForm team={team} member={editing} close={() => { setAdding(false); setEditing(null); }} saved={() => { setAdding(false); setEditing(null); refresh(); }}/ >}
  </section>;
}

function MemberForm({ team, member, close, saved }) {
  const action = useAction();
  return <Modal title={member ? 'Cambiar rol' : 'Agregar miembro'} onClose={close} busy={action.busy}>
    <form className="form" onSubmit={event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
      action.run(async () => { if (member) await changeMemberRole(team.id, member.id, values.role); else await addMember(team.id, values); saved(); });
    }}>
      {member ? <p>{member.user.name} {member.user.lastName}</p> : <><Field label="Correo de su cuenta en Invictus" type="email" name="email" required maxLength={254}/><small>La persona debe estar registrada. Se agregará directamente al Team.</small></>}
      <label>Rol<select name="role" defaultValue={member?.role || 'MEMBER'}><RoleOptions/></select></label>
      <p>Propietario: gestiona miembros y datos. Administrador: edita datos. Miembro: consulta el Team. Siempre debe quedar al menos un propietario.</p>
      <Feedback state={action}/><div className="actions"><button disabled={action.busy}>{action.busy ? 'Guardando…' : 'Guardar miembro'}</button><button type="button" className="secondary" disabled={action.busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}
