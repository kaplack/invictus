import { userLabel } from '../helpers/user.js';
import React, { useState } from 'react';
import { ProofPreview } from './ProofPreview.jsx';
import { Modal } from './Modal.jsx';
import { State, Feedback, Field, Textarea, Status } from './UI.jsx';
import { categoryPrice, paymentTypes } from './EventSetup.jsx';
import { api, upload, base } from '../services/api.js';
import { useData, useAction } from '../hooks/data.js';

const labels = { PENDING: 'Pendiente', PENDING_REVIEW: 'Pendiente de revisión del organizador', OBSERVED: 'Observada: requiere corrección', CONFIRMED: 'Aceptada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada', COMPLETED: 'Finalizada' };
export const RegistrationStatus = ({ status }) => <Status value={status} label={labels[status]}/>;
const amount = r => categoryPrice({ priceCents: r.amountCents || 0, currency: r.currency || 'PEN' });

export function ParticipantFields({ category, participant = {}, guest = false }) {
  return <><p>Los datos son privados para ti y el organizador.</p><div className="form-grid">
    {guest && <><Field label="Nombres" name="name" required maxLength={80} defaultValue={participant.name || ''}/><Field label="Apellidos" name="lastName" required maxLength={120} defaultValue={participant.lastName || ''}/></>}
    {(category.minAge !== null || category.maxAge !== null) && <Field label="Fecha de nacimiento" name="birthDate" type="date" required={category.minAge !== null || category.maxAge !== null} defaultValue={participant.birthDate || ''} max={new Date().toISOString().slice(0,10)}/>}
    {category.gender && <label>Género<select name="gender" required={!!category.gender} defaultValue={participant.gender || ''}><option value="">Sin indicar</option><option value="FEMALE">Femenino</option><option value="MALE">Masculino</option></select></label>}
    <Field label={guest ? 'Teléfono' : 'Teléfono (opcional)'} required={guest} name="phone" type="tel" maxLength={40} defaultValue={participant.phone || ''}/>
  </div></>;
}
function participantFrom(form) { const f = new FormData(form); return { birthDate: f.get('birthDate') || null, gender: f.get('gender') || null, phone: f.get('phone') || '' }; }
export function ProofField({ required, setFile }) { return <label>Comprobante privado{required ? ' (obligatorio)' : ' (opcional)'} · imagen o PDF, hasta 10 MB<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required={required} onChange={e => setFile(e.target.files[0] || null)}/></label>; }
export function PaymentInstructions({ method: m, qrPath }) {
  if (!m) return null;
  return <section className="card"><h4>{m.label} · {paymentTypes[m.type]}</h4>
    {m.holder && <p>Titular: {m.holder}</p>}{m.phone && <p>Celular: {m.phone}</p>}{m.bank && <p>Banco: {m.bank}</p>}
    {m.accountNumber && <p>Cuenta: {m.accountNumber}</p>}{m.cci && <p>CCI: {m.cci}</p>}<p className="preline">{m.instructions}</p>
    {(m.hasQr || m.qrFileId) && <a className="button secondary" href={base + qrPath} target="_blank" rel="noreferrer">Ver QR para pagar</a>}
  </section>;
}
export function CategoryEnrollment({ event, close, initialCategoryId = '' }) {
  const r = useData(`/events/${event.id}/registration-options`), a = useAction();
  const [categoryId, setCategory] = useState(initialCategoryId), [methodId, setMethod] = useState(''), [file, setFile] = useState(null);
  return <Modal title={`Inscribirme · ${event.title}`} onClose={close} busy={a.busy}><State resource={r}>{data => {
    if (data.registration) return <><p>Ya tienes una inscripción en este evento.</p><RegistrationStatus status={data.registration.status}/><p><a className="button" href="#/inscripciones">Ver mis inscripciones</a></p></>;
    const category = data.categories.find(c => c.id === categoryId), method = data.methods.find(m => m.id === methodId);
    const methods = data.methods.filter(m => m.currency === category?.currency);
    return <form className="form" onSubmit={e => {
      e.preventDefault(); const participant = participantFrom(e.currentTarget);
      a.run(async () => {
        const proofFileId = file && category.priceCents ? (await upload(file, 'private')).id : null;
        await api(`/events/${event.id}/register`, 'POST', { categoryId, methodId: category.priceCents ? methodId : null, participant, proofFileId });
        location.hash = '/inscripciones'; close();
      });
    }}><fieldset disabled={a.busy} className="form">
      <label>Categoría<select value={categoryId} required onChange={e => { setCategory(e.target.value); setMethod(''); setFile(null); }}><option value="">Selecciona una categoría</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name} · {categoryPrice(c)}</option>)}</select></label>
      {category && <><p>{category.description}</p><strong>{categoryPrice(category)}</strong><ParticipantFields key={category.id} category={category}/>
        {category.priceCents > 0 && <><label>Método de pago<select value={methodId} required onChange={e => { setMethod(e.target.value); setFile(null); }}><option value="">Selecciona un método</option>{methods.map(m => <option key={m.id} value={m.id}>{m.label} · {paymentTypes[m.type]}</option>)}</select></label>
          {!methods.length && <p role="alert">No hay métodos disponibles para esta categoría.</p>}
          {method && <><PaymentInstructions method={method} qrPath={`/events/${event.id}/payment-methods/${method.id}/qr`}/><ProofField key={method.id} required={method.type !== 'CASH'} setFile={setFile}/></>}
        </>}
        <p>Tu inscripción reservará cupo y quedará pendiente de revisión por el organizador. Solo puedes elegir una categoría; una inscripción rechazada no se puede reactivar.</p>
        <button disabled={category.priceCents > 0 && !methodId}>Enviar inscripción</button>
      </>}
    </fieldset><Feedback state={a}/></form>;
  }}</State></Modal>;
}

export function RegistrationDetail({ id, manager = false, changed = () => {} }) {
  const r = useData(`/registrations/${id}`), a = useAction(), [file, setFile] = useState(null), [decision, setDecision] = useState('CONFIRMED'), [proof, setProof] = useState(null);
  const refresh = () => { r.reload(); changed(); setFile(null); };
  return <><State resource={r}>{data => <>
    <h3>{data.event.title} · {data.categorySnapshot.name}</h3><p>Organiza: {data.event.publicOrganizerName || data.event.team?.name || 'Organizador independiente'}</p>
    <RegistrationStatus status={data.status}/><p><strong>{amount(data)}</strong> · {data.paymentInstructionsSnapshot?.label || 'Sin pago'}</p>
    <p>{userLabel(data.participantSnapshot)} · {data.participantSnapshot.email}</p>
    <p>{data.participantSnapshot.birthDate ? `Nacimiento: ${data.participantSnapshot.birthDate} · ` : ''}{data.participantSnapshot.gender === 'FEMALE' ? 'Femenino' : data.participantSnapshot.gender === 'MALE' ? 'Masculino' : ''}{data.participantSnapshot.phone ? ` · ${data.participantSnapshot.phone}` : ''}</p>
    {data.reviewNote && <p className="callout"><strong>Motivo del organizador:</strong> {data.reviewNote}</p>}
    <PaymentInstructions method={data.paymentInstructionsSnapshot} qrPath={`/registrations/${id}/qr`}/>
    {data.payments.map(p => <section className="payment-row" key={p.id}><span>{new Date(p.createdAt).toLocaleString('es-PE')} · {({ pending: 'Pendiente', pending_review: 'En revisión', verified: 'Verificado', rejected: 'Rechazado', observed: 'Observado' })[p.status]}</span>{p.rejectionReason && <p>{p.rejectionReason}</p>}{p.proofFileId && <button type="button" className="secondary" onClick={()=>setProof(`${base}/registrations/${id}/payments/${p.id}/proof`)}>Ver comprobante</button>}</section>)}
    {!manager && data.status === 'OBSERVED' && <form key={data.version} className="form" onSubmit={e => {
      e.preventDefault(); const participant = participantFrom(e.currentTarget);
      a.run(async () => {
        const proofFileId = file ? (await upload(file, 'private')).id : null;
        await api(`/registrations/${id}/resubmit`, 'POST', { version: data.version, participant, proofFileId }); refresh();
      }, 'Corrección enviada al organizador.');
    }}><h4>Corregir y reenviar</h4><fieldset className="form" disabled={a.busy}><ParticipantFields category={data.categorySnapshot} participant={data.participantSnapshot}/>
      {data.amountCents > 0 && <><p>Adjunta nuevamente el comprobante para conservar ambos intentos en el historial.</p><ProofField required={data.paymentInstructionsSnapshot.type !== 'CASH'} setFile={setFile}/></>}
      <button>Reenviar inscripción</button></fieldset></form>}
    {manager && data.status === 'PENDING_REVIEW' && <form className="form" onSubmit={e => {
      e.preventDefault(); const note = new FormData(e.currentTarget).get('note');
      a.run(async () => { await api(`/registrations/${id}/review`, 'POST', { version: data.version, decision, note }); refresh(); }, 'Revisión guardada.');
    }}><h4>Revisar inscripción</h4><label>Decisión<select value={decision} disabled={a.busy} onChange={e => setDecision(e.target.value)}><option value="CONFIRMED">Aceptar inscripción{data.amountCents > 0 ? ' y verificar pago' : ''}</option><option value="OBSERVED">Observar y solicitar corrección</option><option value="REJECTED">Rechazar definitivamente</option></select></label>
      <Textarea label="Motivo" name="note" required={decision !== 'CONFIRMED'} maxLength={300} disabled={a.busy}/>
      <p>{decision === 'OBSERVED' ? 'Se conserva el cupo mientras el participante corrige.' : decision === 'REJECTED' ? 'Se libera el cupo. Esta inscripción no podrá reactivarse.' : 'Confirma que revisaste los datos y, si corresponde, el pago recibido.'}</p><button disabled={a.busy}>Guardar revisión</button>
    </form>}
    <details><summary>Historial de cambios ({data.audits.length})</summary>{data.audits.map(h => <p key={h.id}>{new Date(h.createdAt).toLocaleString('es-PE')} · {h.actor ? userLabel(h.actor) : 'Participante invitado'} · {labels[h.toStatus]}{h.note ? `: ${h.note}` : ''}</p>)}</details>
  </>}</State><Feedback state={a}/>{proof&&<ProofPreview url={proof} close={()=>setProof(null)}/>}</>;
}
