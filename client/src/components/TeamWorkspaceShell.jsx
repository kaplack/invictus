import React, { useEffect, useId, useRef, useState } from 'react';
import { api, fileUrl } from '../services/api.js';
import UserMenu from './UserMenu.jsx';
import { OutlineIcon } from './OutlineIcon.jsx';
import { Modal } from './Modal.jsx';
import '../styles/team-workspace.css';
const roles = { OWNER: 'Propietario', ADMIN: 'Administrador', MEMBER: 'Miembro' };
const icons = { inicio: 'home', eventos: 'calendar', miembros: 'users', comunicados: 'note', configuracion: 'settings' };
function Identity({ team }) {
  return <>{team.logoFileId ? <img src={fileUrl(team.logoFileId)} alt=""/> : <span className="workspace-monogram" aria-hidden="true">{team.name.slice(0, 1)}</span>}<span>{team.name}</span></>;
}
function Switcher({ team, section, items, error }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null), panelId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    const element = root.current;
    element.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); element.removeEventListener('keydown', escape); };
  }, [open]);
  const canSwitch = items.some(item => item.id !== team.id);
  return <div className="workspace-switcher" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    {canSwitch ? <button ref={trigger} className="workspace-switcher-trigger secondary" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}><Identity team={team}/><span aria-hidden="true">⌄</span></button> : <div className="workspace-switcher-trigger"><Identity team={team}/></div>}
    {canSwitch && <div id={panelId} className="workspace-switcher-panel" hidden={!open}><p>CAMBIAR TEAM</p>{items.map(item => <a key={item.id} href={`#/mis-teams/${item.id}/${section}`} aria-current={item.id === team.id ? 'true' : undefined} onClick={() => setOpen(false)}><Identity team={item}/>{item.id === team.id && <span aria-hidden="true">✓</span>}</a>)}<a href="#/mis-teams">Ver todos los Teams →</a></div>}
    {error && <p role="alert">{error} <a href="#/mis-teams">Ver Teams</a></p>}
  </div>;
}
export default function TeamWorkspaceShell({ team, user, section, onLogout, sessionError, children }) {
  const [open, setOpen] = useState(false), [items, setItems] = useState([]), [error, setError] = useState('');
  useEffect(() => setOpen(false), [section]);
  useEffect(() => {
    let active = true;
    (async () => {
      let offset = 0, all = [];
      do { const data = await api(`/teams/event-options?offset=${offset}`); all.push(...data.items); offset = data.nextOffset; } while (offset !== null);
      if (active) setItems(all);
    })().catch(() => { if (active) setError('No se pudieron cargar los equipos.'); });
    return () => { active = false; };
  }, [team.id]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 801px)');
    const close = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  const links = [['inicio', 'Inicio'], ['miembros', 'Miembros'], ['eventos', 'Eventos'], ['comunicados', 'Comunicados'], ...(team.capabilities.edit ? [['configuracion', 'Configuración']] : [])];
  const publicLink = team.active && team.discoverable ? <a className="workspace-public" href={`#/teams/${team.id}`}>Ver página pública ↗</a> : null;
  const switcher = <Switcher team={team} section={section} items={items} error={error}/>;
  const navigation = <nav aria-label="Equipo">{links.map(([key, label]) => <a key={key} href={`#/mis-teams/${team.id}/${key}`} aria-current={(section === key || key === 'configuracion' && section === 'cobros') ? 'page' : undefined} onClick={() => setOpen(false)}><OutlineIcon name={icons[key]}/>{label}{key === 'comunicados' && <small>PRONTO</small>}</a>)}</nav>;
  const footer = <div className="workspace-sidebar-footer"><a href="#/mis-teams">← Volver a Teams</a><button className="secondary workspace-logout" onClick={() => { setOpen(false); onLogout(); }}><OutlineIcon name="logout"/>Cerrar sesión</button></div>;
  return <div className="team-workspace-shell">
    <header className="workspace-header"><button className="workspace-menu secondary" aria-label="Abrir menú del equipo" aria-expanded={open} onClick={() => setOpen(true)}>☰</button><a className="brand" href="#/" aria-label="Invictus: volver a la web">INVICTUS</a><div className="workspace-header-tools"><div className="workspace-desktop-tools">{publicLink}{switcher}</div><UserMenu user={user} manager={['ADMIN', 'ORGANIZER'].includes(user.role)} route={`/mis-teams/${team.id}/${section}`} onLogout={onLogout}/></div></header>
    <div className="workspace-body"><aside className="workspace-sidebar">{navigation}{footer}</aside><main className="workspace-main" id="main" tabIndex={-1}><div className="team-context"><span>{team.name}</span><span className="badge">{roles[team.role]}</span></div>{sessionError && <p className="error" role="alert">{sessionError}</p>}{children}</main></div>
    {open && <div className="workspace-drawer-host"><Modal title="Menú del equipo" onClose={() => setOpen(false)}><div className="workspace-drawer-context">{switcher}<p>{[team.disciplines?.map(item => item.name).join(', '), roles[team.role]].filter(Boolean).join(' · ')}</p></div>{navigation}{publicLink}{footer}</Modal></div>}
  </div>;
}
