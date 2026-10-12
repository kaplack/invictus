import CompetitorNumber,{formatCompetitorNumber} from './CompetitorNumber.jsx';
import {classificationLabel} from '../helpers/registration-classification.js';
import { userLabel } from '../helpers/user.js';
import React, { useEffect, useState } from 'react';
import { Modal } from './Modal.jsx';
import { State, Records, Status } from './UI.jsx';
import { RegistrationDetail, RegistrationStatus } from './CategoryRegistration.jsx';
import { categoryPrice } from './EventSetup.jsx';
import { OutlineIcon } from './OutlineIcon.jsx';
import { useData } from '../hooks/data.js';
import { ProofPreview } from './ProofPreview.jsx';
import { base } from '../services/api.js';
import '../styles/registration-manager.css';

export default function EventRegistrations({ event, close, embedded = false }) {
  const [filters, setFilters] = useState({}), [offset, setOffset] = useState(0), [selected, setSelected] = useState(null);
  const [proof, setProof] = useState(null);
  const query = new URLSearchParams({ ...filters, offset }).toString(), r = useData(`/events/${event.id}/registrations?${query}`);
  const content = <>
    <State resource={{...r,loading:r.loading&&!r.data,error:r.data?'':r.error}}>{data => <>
      <RegistrationSummary data={data} event={event} status={filters.status} selectStatus={status=>{const next={...filters};if(status===filters.status)delete next.status;else next.status=status;setFilters(next);setOffset(0);}}/>
      <RegistrationFilters categories={data.categories} filters={filters} apply={values=>{setFilters(values);setOffset(0);}} embedded={embedded}/>
      <p role="status" aria-live="polite">{r.loading?'Actualizando inscripciones…':`${data.total} inscripciones encontradas.`}</p>
      {r.error&&<div role="alert"><p>{r.error}</p><button type="button" className="secondary" onClick={r.reload}>Reintentar</button></div>}
      <div className="registration-results" aria-busy={r.loading} inert={r.loading||!!r.error}>
      <Records items={data.items} mobileContent={i=><CompactParticipant item={i}/>} columns={[
        { label: 'N.º competidor', render: i => i.competitorNumber?formatCompetitorNumber(i.competitorNumber):'—' },
        { label: 'Team', render: i => i.participantSnapshot?.teamName || 'Independiente' },
        { label: 'Participante', render: i => <>{userLabel(i.participantSnapshot || i.user)}<p>{i.participantSnapshot?.phone || i.user?.email || ''}</p></> },
        { label: 'Categoría', render: i => <>{classificationLabel(i.categorySnapshot)}{i.categorySnapshot?.classificationWarning&&<p className="callout">{i.categorySnapshot.classificationWarning}</p>}</> },
        { label: 'Importe y método', render: i => <>{categoryPrice({ priceCents: i.amountCents || 0, currency: i.currency || 'PEN' })}<p>{i.paymentInstructionsSnapshot?.label || 'Sin pago'}</p></> },
        { label: 'Estado', render: i => (i.categoryId || i.guestAccessHash || i.participantSnapshot) ? <RegistrationStatus status={i.status}/> : <Status value={i.status}/> },
      ]} actions={i => (i.categoryId || i.guestAccessHash || i.participantSnapshot) && <div className="registration-row-actions">
        <button type="button" className="secondary icon-action" aria-label="Ver inscripción" data-tooltip="Ver inscripción" onClick={() => setSelected({id:i.id,tab:'registration'})}><OutlineIcon name="user"/></button>
        {i.proofPaymentId&&<button type="button" className="secondary icon-action" aria-label="Ver comprobante" data-tooltip="Ver comprobante" onClick={() => setProof({url:`${base}/registrations/${i.id}/payments/${i.proofPaymentId}/proof`,recipient:i.paymentInstructionsSnapshot})}><OutlineIcon name="note"/></button>}
        <button type="button" className="secondary icon-action" aria-label="Ver historial" data-tooltip="Ver historial" onClick={() => setSelected({id:i.id,tab:'history'})}><OutlineIcon name="history"/></button>
      </div>}/>
      {(offset > 0 || data.nextOffset !== null) && <nav className="actions" aria-label="Páginas de inscripciones"><button className="secondary" disabled={!offset} onClick={() => setOffset(Math.max(0,offset-20))}>Anterior</button><span aria-live="polite">Página {offset/20+1} de {Math.max(1,Math.ceil(data.total/20))} · 20 por página</span><button className="secondary" disabled={data.nextOffset === null} onClick={() => setOffset(data.nextOffset)}>Siguiente</button></nav>}
      </div>
    </>}</State>
    {selected&&<Modal title="Detalle de inscripción" className="registration-drawer" onClose={()=>setSelected(null)}><RegistrationDetail key={selected.id} id={selected.id} manager initialTab={selected.tab} changed={r.reload}/></Modal>}
    {proof&&<ProofPreview {...proof} close={()=>setProof(null)}/>}
  </>;
  return embedded ? content : <Modal title={`Inscripciones · ${event.title}`} onClose={close}>{content}</Modal>;
}

function CompactParticipant({item:i}) {
 const phone=i.participantSnapshot?.phone||'';
 const digits=phone.replace(/\D/g,'');
 const destination=/^9\d{8}$/.test(digits)?`51${digits}`:/^519\d{8}$/.test(digits)?digits:/^\+\d[\d\s()-]+$/.test(phone)&&digits.length>=8&&digits.length<=15?digits:null;
 return <div className="compact-participant">
  <div className="compact-participant-heading"><strong>{userLabel(i.participantSnapshot||i.user)}</strong><RegistrationStatus status={i.status}/></div>
  <CompetitorNumber number={i.competitorNumber} compact/><p className="compact-participant-category">{classificationLabel(i.categorySnapshot)}</p>
  {i.categorySnapshot?.classificationWarning&&<p className="callout">{i.categorySnapshot.classificationWarning}</p>}
  {destination?<a className="compact-participant-contact" href={`https://wa.me/${destination}`} target="_blank" rel="noopener noreferrer" aria-label={`Escribir por WhatsApp al ${phone}`} title="Escribir por WhatsApp"><OutlineIcon name="whatsapp"/><span>{phone}</span></a>:phone?<p className="compact-participant-phone">{phone}</p>:i.participantSnapshot?.email||i.user?.email?<p className="compact-participant-phone">{i.participantSnapshot?.email||i.user.email}</p>:null}
 </div>;
}

function RegistrationSummary({data,event,status,selectStatus}) {
 const [categoriesOpen,setCategoriesOpen]=useState(false);
 const {occupied,capacity,statuses}=data.summary;
 const limited=capacity!==null&&capacity!==undefined;
 const available=limited?Math.max(0,capacity-occupied):null;
 const stateIcons={PENDING_REVIEW:'clock',OBSERVED:'alert',CONFIRMED:'check',REJECTED:'rejected',PENDING:'clock',CANCELLED:'rejected',COMPLETED:'check'};
 const chips=[['PENDING_REVIEW','Pendientes'],['OBSERVED','Observadas'],['CONFIRMED','Aceptadas'],['REJECTED','Rechazadas'],...(['PENDING','CANCELLED','COMPLETED'].filter(key=>statuses[key]||status===key).map(key=>[key,{PENDING:'Pendientes de pago',CANCELLED:'Canceladas',COMPLETED:'Finalizadas'}[key]]))];
 return <section className="registration-summary" aria-label="Resumen de inscripciones">
  <div className="registration-capacity-heading"><strong><span className="registration-capacity-desktop">{occupied}{limited?` de ${capacity}`:''} cupos reservados</span><span className="registration-capacity-mobile">{occupied}{limited?`/${capacity}`:''} reservados</span></strong><span><span className="registration-capacity-desktop">{limited?`${available} disponibles`:'Sin límite de cupos'}</span><span className="registration-capacity-mobile">{limited?`· ${available} libres`:'· Sin límite'}</span></span><span className="registration-capacity-info" tabIndex={0} aria-label="Los cupos reservados incluyen inscripciones pendientes, observadas y aceptadas." data-tooltip="Incluye pendientes, observadas y aceptadas."><OutlineIcon name="info"/></span></div>
  <div className="registration-capacity-row">
   {limited&&<progress className="registration-capacity-bar" value={Math.min(occupied,capacity)} max={Math.max(1,capacity)} aria-label="Cupos reservados" aria-valuetext={`${occupied} de ${capacity} cupos reservados`}/>}
   {data.categories.length>0&&<button type="button" className="secondary registration-category-button" aria-label={`Detalles por ${event.competitionConfig?'distancia':'categoría'}`} title={`Detalles por ${event.competitionConfig?'distancia':'categoría'}`} aria-haspopup="dialog" onClick={()=>setCategoriesOpen(true)}><OutlineIcon name="users"/><span>Detalles por {event.competitionConfig?'distancia':'categoría'}</span></button>}
  </div>
  <div className="registration-state-chips" role="group" aria-label="Filtrar por estado">{chips.map(([key,label])=><button key={key} type="button" className="secondary registration-state-chip" data-status={key} aria-label={`${label} ${statuses[key]||0}`} title={label} aria-pressed={status===key} onClick={()=>selectStatus(key)}><OutlineIcon name={stateIcons[key]} className="registration-state-icon"/><span className="registration-state-label">{label}</span><span className="registration-state-count">{statuses[key]||0}</span></button>)}</div>
  <p className="registration-active-state" aria-live="polite">Mostrando: {chips.find(([key])=>key===status)?.[1]||'Todos los estados'}</p>
  {categoriesOpen&&<Modal title={`Cupos por ${event.competitionConfig?'distancia':'categoría'}`} onClose={()=>setCategoriesOpen(false)}>
   <p>{occupied}{limited?` de ${capacity}`:''} cupos reservados en el evento.</p>
   {data.categories.some(c=>c.capacity===null||c.capacity===undefined)&&<p className="muted">Las categorías sin límite propio comparten {limited?`los ${capacity} cupos del evento`:'el cupo general del evento'}.</p>}
   <ul className="registration-category-list">{data.categories.map(c=><li key={c.id}><span>{c.name}</span><strong>{c.occupied}{c.capacity!==null&&c.capacity!==undefined?` / ${c.capacity}`:''}<small>reservados</small></strong></li>)}</ul>
  </Modal>}
 </section>;
}

function RegistrationFilters({categories,filters,apply,embedded}) {
 const [search,setSearch]=useState(filters.q||''),[draft,setDraft]=useState(filters),[open,setOpen]=useState(false);
 useEffect(()=>{setDraft(filters);setSearch(filters.q||'');},[filters]);
 const count=['categoryId','status'].filter(key=>filters[key]).length;
 const values=()=>Object.fromEntries(Object.entries({...draft,q:search.trim()}).filter(([,value])=>value));
 const selectors=<>
  <label>Categoría<select aria-label="Categoría" name="categoryId" value={draft.categoryId||''} onChange={e=>setDraft({...draft,categoryId:e.target.value})}><option value="">Todas</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>Estado<select aria-label="Estado" name="status" value={draft.status||''} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="">Todos</option>{Object.entries({PENDING:'Pendientes de pago',PENDING_REVIEW:'Pendientes',OBSERVED:'Observadas',CONFIRMED:'Aceptadas',REJECTED:'Rechazadas',CANCELLED:'Canceladas',COMPLETED:'Finalizadas'}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 </>;
 return <>
  <form className={embedded?'form participants-toolbar':'form'} onSubmit={e=>{e.preventDefault();apply(window.matchMedia('(max-width:850px)').matches&&embedded?{...filters,q:search.trim()}:values());}}>
   <label className="participants-search">Buscar nombre, correo o número<span><input name="q" value={search} onChange={e=>setSearch(e.target.value)} maxLength={120}/><button type="submit" className="secondary" aria-label="Buscar participantes"><OutlineIcon name="search"/></button></span></label>
   <div className="participants-desktop-filters">{selectors}<button className="secondary" type="submit"><OutlineIcon name="filter"/>Aplicar filtros</button></div>
   {embedded&&<button type="button" className="secondary participants-filter-toggle" aria-label={count?'Filtros, '+count+' activos':'Filtros'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setDraft(filters);setOpen(true);}}><OutlineIcon name="filter"/>{count>0&&<span>{count}</span>}</button>}
  </form>
  {open&&<div className="participants-filter-sheet"><Modal title="Filtros de inscripciones" onClose={()=>{setDraft(filters);setOpen(false);}}><form className="form" onSubmit={e=>{e.preventDefault();setOpen(false);apply(values());}}>{selectors}<div className="participants-filter-actions"><button type="button" className="secondary" onClick={()=>setDraft({})}>Limpiar filtros</button><button type="submit"><OutlineIcon name="filter"/>Aplicar filtros</button></div></form></Modal></div>}
 </>;
}
