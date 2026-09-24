import React,{useEffect,useId,useRef} from 'react';
export function Modal({title,children,onClose,busy=false}) {
 const dialog=useRef(null),titleId=useId();
 useEffect(()=>{const previous=document.activeElement,overflow=document.body.style.overflow;dialog.current.showModal();document.body.style.overflow='hidden';return()=>{dialog.current?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={dialog} className="app-modal" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><header className="app-modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="secondary icon-action" aria-label="Cerrar" title="Cerrar" disabled={busy} onClick={onClose}>×</button></header>{children}</dialog>;
}
export function ActionIcon({name}) {
 const paths={edit:<><path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5"/></>,view:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,people:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5.65"/></>};
 return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
