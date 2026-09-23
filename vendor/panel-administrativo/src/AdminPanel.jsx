import React, { useEffect, useRef, useState } from 'react';

export function PanelState({ title, children, error = false }) {
  return <section className="panel-state" role={error ? 'alert' : 'status'}><h2>{title}</h2>{children}</section>;
}

// La aplicación anfitriona conserva la sesión y los servicios HTTP.
export function AdminPanel({ user, permissions, menu, brand = 'Administración', colors = {}, onLogout, busy = false, children }) {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/');
  const [open, setOpen] = useState(false);
  const drawer = useRef(null);
  const content = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    const change = () => { setRoute(location.hash.slice(1) || '/'); setOpen(false); content.current?.focus(); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    if (!open) { drawer.current?.close(); return; }
    drawer.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = matchMedia('(min-width: 800px)');
    const resize = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', resize);
    return () => { document.body.style.overflow = previous; media.removeEventListener('change', resize); drawer.current?.close(); };
  }, [open]);
  if (!permissions.includes('panel:access')) return <PanelState title="Acceso denegado" error />;
  const available = menu.filter(item => (item.permissions || []).every(p => permissions.includes(p)));
  const current = available.find(item => item.path === route);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const navigation = <nav aria-label="Navegación principal">{available.map(item => <a key={item.path} href={'#' + item.path}
    aria-current={current === item ? 'page' : undefined} onClick={() => { setOpen(false); content.current?.focus(); }}>{item.label}</a>)}
    {!available.length && <p>No hay secciones disponibles.</p>}</nav>;
  return <div className="panel-shell" style={{ '--panel-primary': colors.primary, '--panel-sidebar': colors.sidebar, '--panel-sidebar-text': colors.sidebarText }}>
    <a className="panel-skip" href="#panel-content" onClick={e => { e.preventDefault(); content.current?.focus(); }}>Ir al contenido</a>
    <aside className="panel-sidebar"><p className="panel-brand">{brand}</p><p className="panel-caption">PANEL ADMINISTRATIVO</p>{navigation}</aside>
    <div className="panel-workspace"><header className="panel-header">
      <button className="panel-menu" ref={trigger} aria-expanded={open} aria-controls="panel-drawer" aria-haspopup="dialog" onClick={() => setOpen(true)}>Menú</button>
      <span>{brand}</span><span className="panel-user">{user.name}</span><button disabled={busy} onClick={onLogout}>Cerrar sesión</button>
    </header><main id="panel-content" ref={content} tabIndex={-1} className="panel-content">
      <p className="eyebrow">ESPACIO DE ADMINISTRACIÓN</p><h1>{current?.label || 'Sección no disponible'}</h1>
      {children}
      {!available.length ? <PanelState title="Sin secciones asignadas">Contacta con quien administra los permisos.</PanelState>
        : current ? current.render() : <PanelState title="Esta sección no está disponible" error><a href={'#' + available[0].path}>Ir a {available[0].label}</a></PanelState>}
    </main></div>
    <dialog id="panel-drawer" ref={drawer} className="panel-drawer" aria-label="Menú de administración" onCancel={e => { e.preventDefault(); close(); }}>
      <button autoFocus onClick={close}>Cerrar menú</button><p className="panel-brand">{brand}</p>{navigation}
    </dialog>
  </div>;
}
