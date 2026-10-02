import { userLabel } from '../helpers/user.js';
import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { State, Field, Records, Status } from './UI.jsx';
import { RegistrationDetail, RegistrationStatus } from './CategoryRegistration.jsx';
import { categoryPrice } from './EventSetup.jsx';
import { useData } from '../hooks/data.js';

export default function EventRegistrations({ event, close }) {
  const [filters, setFilters] = useState({}), [offset, setOffset] = useState(0), [selected, setSelected] = useState(null);
  const query = new URLSearchParams({ ...filters, offset }).toString(), r = useData(`/events/${event.id}/registrations?${query}`);
  return <Modal title={`Inscripciones · ${event.title}`} onClose={close}>
    {selected ? <><button className="secondary" onClick={() => setSelected(null)}>← Volver al listado</button><RegistrationDetail key={selected} id={selected} manager changed={r.reload}/></> : <State resource={r}>{data => <>
      <p><strong>Cupos reservados: {data.summary.occupied}{data.summary.capacity !== null ? ` / ${data.summary.capacity}` : ''}</strong>. Incluye pendientes, observadas y aceptadas.</p>
      <p>Pendientes: {data.summary.statuses.PENDING_REVIEW || 0} · Observadas: {data.summary.statuses.OBSERVED || 0} · Aceptadas: {data.summary.statuses.CONFIRMED || 0} · Rechazadas: {data.summary.statuses.REJECTED || 0}</p>
      {data.categories.length > 0 && <details><summary>Cupos por categoría</summary>{data.categories.map(c => <p key={c.id}>{c.name}: {c.occupied}{c.capacity ? ` / ${c.capacity}` : ' reservados (cupo del evento)'}</p>)}</details>}
      <form className="form" onSubmit={e => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); setFilters(Object.fromEntries(Object.entries(values).filter(([,v]) => v))); setOffset(0); }}>
        <div className="form-grid"><Field label="Buscar participante o correo" name="q" defaultValue={filters.q || ''} maxLength={120}/>
          <label>Categoría<select name="categoryId" defaultValue={filters.categoryId || ''}><option value="">Todas</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Estado<select name="status" defaultValue={filters.status || ''}><option value="">Todos</option><option value="PENDING_REVIEW">Pendientes</option><option value="OBSERVED">Observadas</option><option value="CONFIRMED">Aceptadas</option><option value="REJECTED">Rechazadas</option></select></label>
        </div><button className="secondary">Aplicar filtros</button>
      </form><p>{data.total} inscripciones encontradas.</p>
      <Records items={data.items} columns={[
        { label: 'Participante', render: i => <>{userLabel(i.user)}<p>{i.user.email}</p></> },
        { label: 'Categoría', render: i => i.categorySnapshot?.name || 'General' },
        { label: 'Importe y método', render: i => <>{categoryPrice({ priceCents: i.amountCents || 0, currency: i.currency || 'PEN' })}<p>{i.paymentInstructionsSnapshot?.label || 'Sin pago'}</p></> },
        { label: 'Estado', render: i => i.categoryId ? <RegistrationStatus status={i.status}/> : <Status value={i.status}/> },
      ]} actions={i => i.categoryId && <button className="secondary" onClick={() => setSelected(i.id)}>Ver y revisar</button>}/>
      {(offset > 0 || data.nextOffset !== null) && <nav className="actions" aria-label="Páginas de inscripciones"><button className="secondary" disabled={!offset} onClick={() => setOffset(Math.max(0,offset-20))}>Anterior</button><span>Página {offset/20+1}</span><button className="secondary" disabled={data.nextOffset === null} onClick={() => setOffset(data.nextOffset)}>Siguiente</button></nav>}
    </>}</State>}
  </Modal>;
}
