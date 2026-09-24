import React, {useEffect, useId, useRef, useState} from 'react';

export default function MainNavigation({route}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const panelId = useId();
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1101px)');
    const reset = () => setOpen(false);
    desktop.addEventListener('change', reset);
    return () => desktop.removeEventListener('change', reset);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className="main-navigation" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button className="navigation-toggle" type="button" ref={trigger}
      aria-label={open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
      aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'}/>
      </svg>
    </button>
    <nav id={panelId} className={`main-navigation-links${open ? ' is-open' : ''}`} aria-label="Principal" onClick={event => {
      if (event.target.closest('a')) { setOpen(false); if (window.matchMedia('(max-width: 1100px)').matches) trigger.current?.focus(); }
    }}>
      <a href="#/eventos" aria-current={route.startsWith('/eventos') ? 'page' : undefined}>Eventos</a>
      <a href="#/tienda" aria-current={route === '/tienda' ? 'page' : undefined}>Reconocimientos</a>
      <a href="#/cotizar" aria-current={route === '/cotizar' ? 'page' : undefined}>A medida</a>
    </nav>
  </div>;
}
