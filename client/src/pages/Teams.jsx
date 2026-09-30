import React, { useEffect, useRef, useState } from 'react';
import { useAction, useData } from '../hooks/data.js';
import { Field, Textarea, State, Feedback, Records, Heading } from '../components/UI.jsx';
import { Modal } from '../components/Modal.jsx';
import { api, fileUrl } from '../services/api.js';
import { saveTeam, changeMemberRole, removeMember } from '../services/teams.js';
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
export function TeamForm({ team, close, saved }) {
  const sports = useData('/disciplines');
  const [disciplineIds, setDisciplineIds] = useState(() => (team.disciplines || []).map(item => item.id));
  const action = useAction(), [logo, setLogo] = useState(null), [removeLogo, setRemoveLogo] = useState(false), [preview, setPreview] = useState(null);
  const [banner, setBanner] = useState(null), [removeBanner, setRemoveBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState(null), [bannerError, setBannerError] = useState('');
  const bannerInput = useRef(null);
  useEffect(() => {
    if (!banner) { setBannerPreview(null); return; }
    const url = URL.createObjectURL(banner);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [banner]);
  useEffect(() => { if (!logo) { setPreview(null); return; } const url = URL.createObjectURL(logo); setPreview(url); return () => URL.revokeObjectURL(url); }, [logo]);
  return <Modal title={team.id ? 'Editar Team' : 'Crear Team'} onClose={close} busy={action.busy}>
    <form className="form" onSubmit={event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
      if (removeLogo) values.logoFileId = null;
      values.disciplineIds = disciplineIds;
      if (removeBanner) values.bannerFileId = null;
      action.run(async () => {
        if (bannerError) throw new Error(bannerError);
        if (logo && logo.size > 10 * 1024 * 1024) throw new Error('El logo debe pesar como máximo 10 MB.');
        saved(await saveTeam(team, values, logo, banner));
      });
    }}>
      <Field label="Nombre del Team (obligatorio)" name="name" defaultValue={team.name} maxLength={120} required/>
      <Textarea label="Descripción (opcional)" name="description" defaultValue={team.description} maxLength={2000}/>
      <fieldset className="team-sports-field" disabled={action.busy}>
        <legend>Deportes del Team (opcional)</legend>
        <small>Puedes seleccionar varios. Ayudan a encontrar tu Team en el catálogo público.</small>
        <State resource={sports}>{items => {
          const choices = [...items, ...(team.disciplines || []).filter(item => !items.some(sport => sport.id === item.id))];
          return choices.length ? <div className="team-sports-options">{choices.map(sport => <label className="check" key={sport.id}>
            <input type="checkbox" checked={disciplineIds.includes(sport.id)} onChange={event => setDisciplineIds(current => event.target.checked ? [...current, sport.id] : current.filter(id => id !== sport.id))}/>
            {sport.name}
          </label>)}</div> : <p>No hay deportes disponibles todavía.</p>;
        }}</State>
      </fieldset>
      <div className="form-grid">
        <Field label="Persona de contacto (opcional)" name="contactName" defaultValue={team.contactName || ''} maxLength={120}/>
        <Field label="Correo de contacto (opcional)" name="email" type="email" defaultValue={team.email || ''} maxLength={254}/>
        <Field label="Teléfono (opcional)" name="phone" type="tel" defaultValue={team.phone || ''} maxLength={40}/>
        <Field label="WhatsApp (opcional)" name="whatsapp" type="tel" defaultValue={team.whatsapp || ''} maxLength={40}/>
      </div>
      <label>Logo público (opcional) · PNG, JPG o WebP, hasta 10 MB<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { setLogo(event.target.files[0] || null); setRemoveLogo(false); }}/></label>
      {(preview || (team.logoFileId && !removeLogo)) && <img className="team-logo" src={preview || fileUrl(team.logoFileId)} alt="Vista previa del logo"/>}
      {team.logoFileId && <label className="check"><input type="checkbox" checked={removeLogo} disabled={!!logo} onChange={event => setRemoveLogo(event.target.checked)}/>Quitar el logo actual</label>}
      <div className="team-banner-field">
        <label>Banner público del Team (opcional)
          <input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={action.busy}
            aria-describedby="team-banner-help team-banner-error" aria-invalid={!!bannerError}
            onChange={event => {
              const file = event.target.files[0];
              if (!file) return;
              const error = !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
                ? 'Elige una imagen JPG, PNG o WebP.'
                : file.size > 10 * 1024 * 1024 ? 'El banner debe pesar como máximo 10 MB.'
                : !file.size ? 'La imagen está vacía.' : '';
              setBannerError(error);
              if (error) { event.target.value = ''; return; }
              setBanner(file); setRemoveBanner(false);
            }}/>
        </label>
        <small id="team-banner-help">JPG, PNG o WebP, hasta 10 MB. Se muestra en la parte superior de la card. Recomendamos una imagen horizontal; el logo se mantiene separado.</small>
        <p id="team-banner-error" role={bannerError ? 'alert' : undefined} className="team-banner-error">{bannerError}</p>
        {(bannerPreview || (team.bannerFileId && !removeBanner)) && <img className="team-banner-preview" src={bannerPreview || fileUrl(team.bannerFileId)} alt="Vista previa del banner"/>}
        {(banner || (team.bannerFileId && !removeBanner) || bannerError) && <button type="button" className="secondary" disabled={action.busy} onClick={() => {
          setBanner(null); setRemoveBanner(true); setBannerError(''); bannerInput.current.value = '';
        }}>Quitar banner</button>}
      </div>
      {!team.id && <p>Serás el propietario del Team. Podrás agregar a otras personas registradas en Invictus.</p>}
      <Feedback state={action}/><div className="actions"><button disabled={action.busy}>{action.busy ? 'Guardando…' : team.id ? 'Guardar cambios' : 'Crear Team'}</button><button type="button" className="secondary" disabled={action.busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}

export function Members({ team, user, reloadTeam, children, showList = true }) {
  const [offset, setOffset] = useState(0), [adding, setAdding] = useState(false), [editing, setEditing] = useState(null);
  const resource = useData(`/teams/${team.id}/members?offset=${offset}`), action = useAction();
  function refresh() { resource.reload(); reloadTeam(); }
  return <section className="team-members team-members-page"><div className="team-members-heading"><Heading title="Miembros"><p>Consulta las personas que forman parte del equipo y sus roles.</p></Heading>{team.capabilities.members && <button onClick={() => setAdding(true)}>Invitar miembro</button>}</div><p className="muted">Solo los propietarios pueden invitar, cambiar roles y quitar miembros.</p>
    <Feedback state={action}/>
    {children}
    {showList && <State resource={resource}>{data => <div className="card team-member-list"><div className="team-panel-heading"><h2>Integrantes del equipo</h2><small>{data.items.length} {data.items.length === 1 ? 'persona en esta página' : 'personas en esta página'}</small></div>
      <Records items={data.items} columns={[
        { label: 'Nombre', render: member => <div className="team-member-identity"><span className="workspace-monogram" aria-hidden="true">{member.user.name?.slice(0,1) || '?'}</span><strong>{member.user.name} {member.user.lastName}{member.userId === user.id && <small> (tú)</small>}</strong></div> },
        { label: 'Rol', render: member => <span className="badge team-role" data-role={member.role}>{roles[member.role]}</span> },
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
    </div>}</State>}
    {(adding || editing) && <MemberForm team={team} member={editing} close={() => { setAdding(false); setEditing(null); }} saved={() => { setAdding(false); setEditing(null); refresh(); }}/ >}
  </section>;
}

function MemberForm({ team, member, close, saved }) {
  const action = useAction();
  return <Modal title={member ? 'Cambiar rol' : 'Invitar miembro'} onClose={close} busy={action.busy}>
    <form className="form" onSubmit={event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
      action.run(async () => { if (member) await changeMemberRole(team.id, member.id, values.role); else await api(`/teams/${team.id}/invitations`, 'POST', {email:values.email}); saved(); });
    }}>
      {member ? <p>{member.user.name} {member.user.lastName}</p> : <><Field label="Correo de su cuenta en Invictus" type="email" name="email" required maxLength={254}/><small>La persona debe estar registrada. Recibirá la invitación en Teams y deberá aceptarla.</small></>}
      {member ? <label>Rol<select name="role" defaultValue={member.role}><RoleOptions/></select></label> : <p>Ingresará con el rol Miembro.</p>}
      <p>Propietario: gestiona miembros, acceso, cobros, perfil y eventos. Administrador: edita el perfil y gestiona eventos. Miembro: consulta el Team. Siempre debe quedar al menos un propietario.</p>
      <Feedback state={action}/><div className="actions"><button disabled={action.busy}>{action.busy ? 'Guardando…' : member ? 'Guardar rol' : 'Enviar invitación'}</button><button type="button" className="secondary" disabled={action.busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}
