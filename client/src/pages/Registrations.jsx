import {classificationLabel} from '../helpers/registration-classification.js';
import React, { useState } from 'react';
import { useData } from '../hooks/data.js';
import { fileUrl } from '../services/api.js';
import { State, Records, date, Status } from '../components/UI.jsx';
import { Modal } from '../components/Modal.jsx';
import { RegistrationDetail } from '../components/CategoryRegistration.jsx';
import { categoryPrice } from '../components/EventSetup.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import '../styles/registrations.css';

const states = {CONFIRMED:'Confirmada',PENDING:'Pendiente',PENDING_REVIEW:'En revisión',OBSERVED:'Requiere corrección',REJECTED:'Rechazada',CANCELLED:'Cancelada',COMPLETED:'Finalizada'};
function EventIdentity({ event }) {
  return <div className="registration-event">
    {event.primaryImageFileId ? <img src={fileUrl(event.primaryImageFileId)} alt="" loading="lazy"/> : <span className="registration-image-placeholder" aria-hidden="true"><OutlineIcon name="calendar"/></span>}
    <div><strong>{event.title}</strong>{event.venue && <p><OutlineIcon name="location"/>{event.venue}</p>}</div>
  </div>;
}
export function Registrations() {
  const resource = useData('/profile/registrations');
  const [selected, setSelected] = useState(null);
  return <section className="registrations-page">
    <header className="registrations-heading"><p>CUENTA</p><h1>Inscripciones</h1><span>Consulta los eventos en los que participas y el estado de tus inscripciones.</span></header>
    <section className="registrations-panel" aria-labelledby="registrations-title">
      <h2 id="registrations-title">Tus inscripciones</h2>
      <State resource={resource}>{items => <>
        <p className="registrations-count">{items.length} {items.length === 1 ? 'evento registrado' : 'eventos registrados'}{items.length === 100 ? ' (últimos 100)' : ''}</p>
        {items.length ? <Records items={items} columns={[
          {label:'Evento',render:item=><EventIdentity event={item.event}/>},
          {label:'Organizador',render:item=>item.event.team?.name || 'Organizador independiente'},
          {label:'Categoría y pago',render:item=><div className="registration-payment">{classificationLabel(item.categorySnapshot)}<p>{categoryPrice({priceCents:item.amountCents || 0,currency:item.currency || 'PEN'})} · {item.paymentInstructionsSnapshot?.label || 'Sin pago'}</p></div>},
          {label:'Fecha',render:item=><div className="registration-date"><OutlineIcon name="calendar"/><span>{date(item.event.startsAt)}</span></div>},
          {label:'Estado',render:item=><><Status value={item.status} label={states[item.status]}/>{item.reviewNote && <p className="registration-review">{item.reviewNote}</p>}</>},
        ]} actions={item=><>
          {item.event.status === 'PUBLISHED' && item.event.publicSlug && <a className="registration-event-link" href={`/eventos/${encodeURIComponent(item.event.publicSlug)}`}>Ver evento <span aria-hidden="true">→</span></a>}
          {(item.categoryId||item.categorySnapshot?.requiresBirthDate) && <button className="registration-detail-button" onClick={()=>setSelected(item.id)}>{item.status === 'OBSERVED' ? 'Corregir inscripción' : 'Ver inscripción'}</button>}
        </>}/> : <div className="empty"><p>Aún no te has inscrito en ningún evento.</p><a className="button" href="/eventos">Explorar eventos</a></div>}
      </>}</State>
      <aside className="registrations-note"><OutlineIcon name="info"/><p>Una inscripción confirmada indica que estás registrado en el evento.<br/>La asistencia, resultados y logros se registran por separado.</p></aside>
    </section>
    {selected && <Modal title="Inscripción" onClose={()=>setSelected(null)}><RegistrationDetail key={selected} id={selected} changed={resource.reload}/></Modal>}
  </section>;
}
