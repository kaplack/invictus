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

const registrationStates = {PENDING_REVIEW:'Por revisar',OBSERVED:'Observadas',CONFIRMED:'Confirmadas',REJECTED:'Rechazadas',CANCELLED:'Canceladas'};

export default function EventRegistrations({ event, close, embedded = false }) {
  const [filters, setFilters] = useState({}), [offset, setOffset] = useState(0), [selected, setSelected] = useState(null);
  const [proof, setProof] = useState(null);
  const {status:displayStatus,...otherFilters}=filters;
  const query = new URLSearchParams({ ...otherFilters, ...(displayStatus?{registrationState:displayStatus}:{}), offset }).toString(), r = useData(`/events/${event.id}/registrations?${query}`);
  const content = <>
    <State resource={{...r,loading:r.loading&&!r.data,error:r.data?'':r.error}}>{data => <>
      <RegistrationSummary data={data} event={event} status={filters.status} paymentPending={!!filters.paymentPending} togglePayment={()=>{setFilters(current=>{const next={...current};if(next.paymentPending)delete next.paymentPending;else next.paymentPending='true';return next;});setOffset(0);}} selectStatus={status=>{const next={...filters};if(!status||status===filters.status)delete next.status;else next.status=status;setFilters(next);setOffset(0);}}/>
      <RegistrationFilters cancelledAvailable={!!data.summary.statuses.CANCELLED} event={event} options={data.filterOptions} categories={data.categories} filters={filters} apply={values=>{setFilters(values);setOffset(0);}} embedded={embedded}/>
      <p className="registration-results-heading" role="status" aria-live="polite">{r.loading?'Actualizando inscripciones…':`${data.total} inscripciones encontradas.`}</p>
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

function RegistrationSummary({data,event,status,selectStatus,paymentPending,togglePayment}) {
 const [categoriesOpen,setCategoriesOpen]=useState(false),[paymentInfoOpen,setPaymentInfoOpen]=useState(false);
 const {occupied,capacity,statuses}=data.summary;
 const limited=capacity!==null&&capacity!==undefined;
 const available=limited?Math.max(0,capacity-occupied):null;
 const stateIcons={PENDING_REVIEW:'clock',OBSERVED:'alert',CONFIRMED:'check',REJECTED:'rejected',PENDING:'clock',CANCELLED:'cancelled',COMPLETED:'check'};
 const chips=[['','Todos'],...Object.entries(registrationStates).filter(([key])=>key!=='CANCELLED'||statuses.CANCELLED||status==='CANCELLED')];
 const chipCount=key=>key?(statuses[key]||0)+(key==='CONFIRMED'?(statuses.COMPLETED||0):0):(data.summary.total??Object.values(statuses).reduce((sum,n)=>sum+n,0));
 return <section className="registration-summary" aria-label="Resumen de inscripciones">
  <div className="registration-capacity-block">
  <div className="registration-capacity-heading"><strong><span className="registration-capacity-desktop">{occupied}{limited?` de ${capacity}`:''} cupos reservados</span><span className="registration-capacity-mobile">{occupied}{limited?`/${capacity}`:''} reservados</span></strong><span><span className="registration-capacity-desktop">{limited?`${available} disponibles`:'Sin límite de cupos'}</span><span className="registration-capacity-mobile">{limited?`· ${available} libres`:'· Sin límite'}</span></span><span className="registration-capacity-info" tabIndex={0} aria-label="Los cupos reservados incluyen inscripciones pendientes, observadas y confirmadas." data-tooltip="Incluye pendientes, observadas y confirmadas."><OutlineIcon name="info"/></span></div>
  <div className="registration-capacity-row">
   {limited&&<progress className="registration-capacity-bar" value={Math.min(occupied,capacity)} max={Math.max(1,capacity)} aria-label="Cupos reservados" aria-valuetext={`${occupied} de ${capacity} cupos reservados`}/>}
   {data.categories.length>0&&<button type="button" className="secondary registration-category-button" aria-label={`Detalles por ${event.competitionConfig?'distancia':'categoría'}`} title={`Detalles por ${event.competitionConfig?'distancia':'categoría'}`} aria-haspopup="dialog" onClick={()=>setCategoriesOpen(true)}><OutlineIcon name="users"/><span>Detalles por {event.competitionConfig?'distancia':'categoría'}</span></button>}
  </div>
  </div>
  <div className="registration-state-chips" role="group" aria-label="Filtrar inscripciones">
   <div className="registration-payment-chip"><button type="button" className="secondary registration-state-chip" aria-label={`Pendientes de pago ${data.summary.pendingPayment||0}`} title="Pendientes de pago" aria-pressed={paymentPending} onClick={togglePayment}><OutlineIcon name="dollar"/><span className="registration-state-label">Pendientes de pago</span><span className="registration-state-count">{data.summary.pendingPayment||0}</span></button><button type="button" className="secondary registration-payment-info" aria-label="Información sobre pendientes de pago" aria-expanded={paymentInfoOpen} aria-controls="registration-payment-help" onClick={()=>setPaymentInfoOpen(!paymentInfoOpen)}><OutlineIcon name="info"/></button><div id="registration-payment-help" className="registration-payment-help" role="note" hidden={!paymentInfoOpen}>Incluye inscripciones cuyo pago aún no está validado, incluido efectivo por recibir o confirmar. Pueden aparecer también en otros estados, como Observadas. Las cantidades no deben sumarse.</div></div>
   <div className="registration-status-options" role="group" aria-label="Estados de inscripción">{chips.map(([key,label])=><button key={key} type="button" className="secondary registration-state-chip" data-status={key} aria-label={`${label} ${chipCount(key)}`} title={label} aria-pressed={key?status===key:!status&&!paymentPending} onClick={()=>{selectStatus(key);if(!key&&paymentPending)togglePayment();}}>{key&&<OutlineIcon name={stateIcons[key]} className="registration-state-icon"/>}<span className="registration-state-label">{label}</span><span className="registration-state-count">{chipCount(key)}</span></button>)}</div>
  </div>
  <p className="registration-active-state" aria-live="polite">Mostrando: {[status?registrationStates[status]:null,paymentPending?'Pendientes de pago':null].filter(Boolean).join(' + ')||'Todas las inscripciones'}</p>
  {categoriesOpen&&<Modal title={`Cupos por ${event.competitionConfig?'distancia':'categoría'}`} onClose={()=>setCategoriesOpen(false)}>
   <p>{occupied}{limited?` de ${capacity}`:''} cupos reservados en el evento.</p>
   {data.categories.some(c=>c.capacity===null||c.capacity===undefined)&&<p className="muted">Las categorías sin límite propio comparten {limited?`los ${capacity} cupos del evento`:'el cupo general del evento'}.</p>}
   <ul className="registration-category-list">{data.categories.map(c=><li key={c.id}><span>{c.name}</span><strong>{c.occupied}{c.capacity!==null&&c.capacity!==undefined?` / ${c.capacity}`:''}<small>reservados</small></strong></li>)}</ul>
  </Modal>}
 </section>;
}

function RegistrationFilters({cancelledAvailable,event,options={},categories,filters,apply,embedded}) {
 const [search,setSearch]=useState(filters.q||''),[draft,setDraft]=useState(filters),[open,setOpen]=useState(false);
 useEffect(()=>{setDraft(filters);},[filters]);
 useEffect(()=>{setSearch(filters.q||'');},[filters.q]);
 useEffect(()=>{
  const q=search.trim();
  if(q===(filters.q||''))return;
  const timer=setTimeout(()=>{const next={...filters};if(q)next.q=q;else delete next.q;apply(next);},300);
  return()=>clearTimeout(timer);
 },[search,filters,apply]);
 const count=['categoryId','gender','modality','status','paymentPending'].filter(key=>filters[key]).length;
 const values=(includeState=false)=>Object.fromEntries(Object.entries({...filters,...(includeState?{status:draft.status||'',paymentPending:draft.paymentPending||''}:{}),categoryId:draft.categoryId||'',gender:draft.gender||'',modality:draft.modality||'',q:search.trim()}).filter(([,value])=>value));
 const categoryLabel=event.competitionConfig?'Distancia':'Categoría';
 const selectors=<>
  {categories.length>0&&<label>{categoryLabel}<select aria-label={categoryLabel} name="categoryId" value={draft.categoryId||''} onChange={e=>setDraft({...draft,categoryId:e.target.value})}><option value="">Todas</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
  {(options.modalities||[]).length>0&&<label>Modalidad<select aria-label="Modalidad" name="modality" value={draft.modality||''} onChange={e=>setDraft({...draft,modality:e.target.value})}><option value="">Todas</option>{options.modalities.map(m=><option key={m} value={m}>{m}</option>)}</select></label>}
  {options.genderEnabled&&<label>Género<select aria-label="Género" name="gender" value={draft.gender||''} onChange={e=>setDraft({...draft,gender:e.target.value})}><option value="">Todos</option><option value="MALE">Masculino</option><option value="FEMALE">Femenino</option></select></label>}
 </>;
 return <>
  <form className={embedded?'form participants-toolbar':'form'} onSubmit={e=>{e.preventDefault();apply(window.matchMedia('(max-width:850px)').matches&&embedded?{...filters,q:search.trim()}:values());}}>
   <label className="participants-search">Buscar nombre, correo o número<span><input name="q" value={search} onChange={e=>setSearch(e.target.value)} maxLength={120}/><button type="submit" className="secondary" aria-label="Buscar participantes"><OutlineIcon name="search"/></button></span></label>
   <div className="participants-desktop-filters">{selectors}<button className="secondary" type="submit"><OutlineIcon name="filter"/>Aplicar filtros</button></div>
   {embedded&&<button type="button" className="secondary participants-filter-toggle" aria-label={count?'Filtros, '+count+' activos':'Filtros'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setDraft(filters);setOpen(true);}}><OutlineIcon name="filter"/>{count>0&&<span>{count}</span>}</button>}
  </form>
  {['categoryId','gender','modality'].some(key=>filters[key])&&<p className="participants-active-filters">{[categories.find(c=>c.id===filters.categoryId)?.name,filters.gender?({MALE:'Masculino',FEMALE:'Femenino'})[filters.gender]:null,filters.modality].filter(Boolean).join(' · ')}</p>}
  {open&&<div className="participants-filter-sheet"><Modal title="Filtros de inscripciones" onClose={()=>{setDraft(filters);setOpen(false);}}><form className="form" onSubmit={e=>{e.preventDefault();setOpen(false);apply(values(true));}}><div className="participants-filter-body"><label>Estado<select aria-label="Estado" value={draft.status||''} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="">Todos los estados</option>{Object.entries(registrationStates).filter(([key])=>key!=='CANCELLED'||cancelledAvailable||filters.status==='CANCELLED').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button type="button" className="secondary registration-state-chip participants-payment-option" aria-pressed={!!draft.paymentPending} onClick={()=>setDraft({...draft,paymentPending:draft.paymentPending?'':'true'})}><OutlineIcon name="dollar"/><span>Pendientes de pago</span>{draft.paymentPending&&<OutlineIcon name="check"/>}</button>{selectors}</div><div className="participants-filter-actions"><button type="button" className="secondary" onClick={()=>setDraft({})}>Limpiar filtros</button><button type="submit"><OutlineIcon name="filter"/>Aplicar filtros</button></div></form></Modal></div>}
 </>;
}
