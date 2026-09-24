import {PanelIcon} from './PanelIcon.jsx';
import React, { useEffect, useRef, useState } from 'react';

export function PanelState({ title, children, error = false }) {
  return <section className="panel-state" role={error ? 'alert' : 'status'}><h2>{title}</h2>{children}</section>;
}

// La aplicación anfitriona conserva la sesión y los servicios HTTP.
export function AdminPanel({ user, permissions, menu, brand = 'Administración', colors = {}, onLogout, busy = false, children }) {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/');
  const [open, setOpen] = useState(false);
  const [collapsed,setCollapsed] = useState(()=>{try{return localStorage.getItem('admin-sidebar-collapsed')==='true';}catch{return false;}});
  const toggleSidebar = () => setCollapsed(value=>{const next=!value;try{localStorage.setItem('admin-sidebar-collapsed',String(next));}catch{}return next;});
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
  const permitted = item => (item.permissions || []).every(p => permissions.includes(p));
  const available = menu.filter(permitted).map(item => item.children ? {...item, children:item.children.filter(permitted)} : item).filter(item => !item.children || item.children.length);
  const pages = available.flatMap(item => item.children || [item]);
  const current = pages.find(item => item.path === route);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const logoutButton = <div className="panel-sidebar-footer"><button type="button" className="panel-logout" disabled={busy} onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><PanelIcon name="logout"/><span className="panel-nav-text">Cerrar sesión</span></button></div>;
  const link = item => <a key={item.path} href={'#' + item.path} title={item.label} aria-label={item.badge>0?`${item.label}, ${item.badge} pendientes`:item.label} aria-current={current === item ? 'page' : undefined} onClick={() => { setOpen(false); content.current?.focus(); }}><span className="panel-nav-icon"><PanelIcon name={item.icon}/></span><span className="panel-nav-text">{item.label}</span>{item.badge > 0 && <span className="panel-nav-badge" aria-label={`${item.badge} pendientes`}>{item.badge}</span>}</a>;
  const navigation = <nav aria-label="Navegación principal">{available.map(item => item.children ? <div className="panel-nav-group" key={item.label}><p className="panel-nav-group-label">{item.label}</p><div className="panel-nav-children">{item.children.map(link)}</div></div> : link(item))}
    {!available.length && <p>No hay secciones disponibles.</p>}</nav>;
  return <div className={`panel-shell${collapsed ? ' panel-collapsed' : ''}`} style={{ '--panel-primary': colors.primary, '--panel-sidebar': colors.sidebar, '--panel-sidebar-text': colors.sidebarText }}>
    <a className="panel-skip" href="#panel-content" onClick={e => { e.preventDefault(); content.current?.focus(); }}>Ir al contenido</a>
    <aside id="admin-sidebar" className="panel-sidebar"><div className="panel-sidebar-top"><p className="panel-brand">{brand}</p><button type="button" className="panel-collapse-toggle" onClick={toggleSidebar} aria-expanded={!collapsed} aria-controls="admin-sidebar" aria-label={collapsed?'Expandir menú lateral':'Contraer menú lateral'} title={collapsed?'Expandir menú lateral':'Contraer menú lateral'}><PanelIcon name={collapsed?'expand':'collapse'}/></button></div><p className="panel-caption">PANEL ADMINISTRATIVO</p>{navigation}{logoutButton}</aside>
    <div className="panel-workspace"><header className="panel-header">
      <button className="panel-menu" ref={trigger} aria-expanded={open} aria-controls="panel-drawer" aria-haspopup="dialog" onClick={() => setOpen(true)} aria-label="Abrir menú" title="Abrir menú"><PanelIcon name="menu"/></button>
      <span>{brand}</span><span className="panel-user">{user.name}</span>
    </header><main id="panel-content" ref={content} tabIndex={-1} className="panel-content">
      <p className="eyebrow">ESPACIO DE ADMINISTRACIÓN</p><h1>{current?.label || 'Sección no disponible'}</h1>
      {children}
      {!available.length ? <PanelState title="Sin secciones asignadas">Contacta con quien administra los permisos.</PanelState>
        : current ? current.render() : <PanelState title="Esta sección no está disponible" error><a href={'#' + pages[0].path}>Ir a {pages[0].label}</a></PanelState>}
    </main></div>
    <dialog id="panel-drawer" ref={drawer} className="panel-drawer" aria-label="Menú de administración" onCancel={e => { e.preventDefault(); close(); }}>
      <div className="panel-sidebar-top"><p className="panel-brand">{brand}</p><button type="button" className="panel-collapse-toggle" autoFocus onClick={close} aria-label="Cerrar menú" title="Cerrar menú"><PanelIcon name="close"/></button></div>{navigation}{logoutButton}
    </dialog>
  </div>;
}
