import {classificationLabel} from '../helpers/registration-classification.js';
import { userLabel } from '../helpers/user.js';
import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { State, Records, Status } from './UI.jsx';
import { RegistrationDetail, RegistrationStatus } from './CategoryRegistration.jsx';
import { categoryPrice } from './EventSetup.jsx';
import { OutlineIcon } from './OutlineIcon.jsx';
import { useData } from '../hooks/data.js';

export default function EventRegistrations({ event, close, embedded = false }) {
  const [filters, setFilters] = useState({}), [offset, setOffset] = useState(0), [selected, setSelected] = useState(null);
  const query = new URLSearchParams({ ...filters, offset }).toString(), r = useData(`/events/${event.id}/registrations?${query}`);
  const content = <>
    {selected ? <><button className="secondary" onClick={() => setSelected(null)}>← Volver al listado</button><RegistrationDetail key={selected} id={selected} manager changed={r.reload}/></> : <State resource={r}>{data => <>
      <p><strong>Cupos reservados: {data.summary.occupied}{data.summary.capacity !== null ? ` / ${data.summary.capacity}` : ''}</strong>. Incluye pendientes, observadas y aceptadas.</p>
      <p>Pendientes: {data.summary.statuses.PENDING_REVIEW || 0} · Observadas: {data.summary.statuses.OBSERVED || 0} · Confirmadas: {data.summary.statuses.CONFIRMED || 0} · Rechazadas: {data.summary.statuses.REJECTED || 0}</p>
      {data.categories.length > 0 && <details><summary>{event.competitionConfig?'Inscritos por distancia':'Cupos por categoría'}</summary>{data.categories.map(c => <p key={c.id}>{c.name}: {c.occupied}{c.capacity ? ` / ${c.capacity}` : ' reservados (cupo del evento)'}</p>)}</details>}
      <RegistrationFilters categories={data.categories} filters={filters} apply={values=>{setFilters(values);setOffset(0);}} embedded={embedded}/><p>{data.total} inscripciones encontradas.</p>
      <Records items={data.items} columns={[
        { label: 'Participante', render: i => <>{userLabel(i.participantSnapshot || i.user)}<p>{i.participantSnapshot?.phone || i.user?.email || ''}</p></> },
        { label: 'Categoría', render: i => <>{classificationLabel(i.categorySnapshot)}{i.categorySnapshot?.classificationWarning&&<p className="callout">{i.categorySnapshot.classificationWarning}</p>}</> },
        { label: 'Importe y método', render: i => <>{categoryPrice({ priceCents: i.amountCents || 0, currency: i.currency || 'PEN' })}<p>{i.paymentInstructionsSnapshot?.label || 'Sin pago'}</p></> },
        { label: 'Estado', render: i => (i.categoryId || i.guestAccessHash || i.participantSnapshot) ? <RegistrationStatus status={i.status}/> : <Status value={i.status}/> },
      ]} actions={i => (i.categoryId || i.guestAccessHash) && <button className="secondary" onClick={() => setSelected(i.id)}>Ver y revisar</button>}/>
      {(offset > 0 || data.nextOffset !== null) && <nav className="actions" aria-label="Páginas de inscripciones"><button className="secondary" disabled={!offset} onClick={() => setOffset(Math.max(0,offset-20))}>Anterior</button><span aria-live="polite">Página {offset/20+1} de {Math.max(1,Math.ceil(data.total/20))} · 20 por página</span><button className="secondary" disabled={data.nextOffset === null} onClick={() => setOffset(data.nextOffset)}>Siguiente</button></nav>}
    </>}</State>}
  </>;
  return embedded ? content : <Modal title={`Inscripciones · ${event.title}`} onClose={close}>{content}</Modal>;
}

function RegistrationFilters({categories,filters,apply,embedded}) {
 const [search,setSearch]=useState(filters.q||''),[draft,setDraft]=useState(filters),[open,setOpen]=useState(false);
 const count=['categoryId','status'].filter(key=>filters[key]).length;
 const values=()=>Object.fromEntries(Object.entries({...draft,q:search.trim()}).filter(([,value])=>value));
 const selectors=<>
  <label>Categoría<select aria-label="Categoría" name="categoryId" value={draft.categoryId||''} onChange={e=>setDraft({...draft,categoryId:e.target.value})}><option value="">Todas</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>Estado<select aria-label="Estado" name="status" value={draft.status||''} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="">Todos</option>{Object.entries({PENDING:'Pendientes de pago',PENDING_REVIEW:'Pendientes',OBSERVED:'Observadas',CONFIRMED:'Confirmadas',REJECTED:'Rechazadas',CANCELLED:'Canceladas',COMPLETED:'Finalizadas'}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 </>;
 return <>
  <form className={embedded?'form participants-toolbar':'form'} onSubmit={e=>{e.preventDefault();apply(window.matchMedia('(max-width:850px)').matches&&embedded?{...filters,q:search.trim()}:values());}}>
   <label className="participants-search">Buscar participante o correo<span><input name="q" value={search} onChange={e=>setSearch(e.target.value)} maxLength={120}/><button type="submit" className="secondary" aria-label="Buscar participantes"><OutlineIcon name="search"/></button></span></label>
   <div className="participants-desktop-filters">{selectors}<button className="secondary" type="submit"><OutlineIcon name="filter"/>Aplicar filtros</button></div>
   {embedded&&<button type="button" className="secondary participants-filter-toggle" aria-label={count?'Filtros, '+count+' activos':'Filtros'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setDraft(filters);setOpen(true);}}><OutlineIcon name="filter"/>{count>0&&<span>{count}</span>}</button>}
  </form>
  {open&&<div className="participants-filter-sheet"><Modal title="Filtros de inscripciones" onClose={()=>{setDraft(filters);setOpen(false);}}><form className="form" onSubmit={e=>{e.preventDefault();setOpen(false);apply(values());}}>{selectors}<div className="participants-filter-actions"><button type="button" className="secondary" onClick={()=>setDraft({})}>Limpiar filtros</button><button type="submit"><OutlineIcon name="filter"/>Aplicar filtros</button></div></form></Modal></div>}
 </>;
}
