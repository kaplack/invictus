import React, {useEffect, useId, useRef, useState} from 'react';

export default function UserMenu({user, manager, route, onLogout}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const panelId = useId();
  const name = user.name?.trim() || 'Mi cuenta';
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="user-menu" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button type="button" className="user-menu-trigger" ref={trigger} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <span className="user-menu-avatar" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg></span>
      <span className="user-menu-name" title={name}>{name}</span>
      <svg className="user-menu-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div className="user-menu-panel" id={panelId} hidden={!open}>
      <a href="#/perfil" aria-current={(route === '/perfil' || route === '/cuenta') ? 'page' : undefined} onClick={() => setOpen(false)}>Mi perfil</a>
      <a href="#/inscripciones" aria-current={route === '/inscripciones' ? 'page' : undefined} onClick={() => setOpen(false)}>Mis inscripciones</a>
      <a href="#/mis-eventos" aria-current={route === '/mis-eventos' ? 'page' : undefined} onClick={() => setOpen(false)}>Mis eventos</a>
      <a href="#/pedidos" aria-current={route === '/pedidos' ? 'page' : undefined} onClick={() => setOpen(false)}>Mis pedidos</a>
      {manager && <a href={import.meta.env.VITE_ADMIN_URL || 'http://localhost:5175'} onClick={() => setOpen(false)}>Gestión</a>}
      <div className="user-menu-divider"/>
      <button type="button" onClick={() => { setOpen(false); onLogout(); }}>Salir</button>
    </div>
  </div>;
}
