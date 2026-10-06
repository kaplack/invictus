import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { Field, Textarea, State, Feedback, Records } from './UI.jsx';
import { useAction, useData } from '../hooks/data.js';
import { api } from '../services/api.js';
import { MethodForm, Currency, paymentTypes } from './TeamPaymentMethods.jsx';

export { Currency, paymentTypes } from './TeamPaymentMethods.jsx';
export const categoryPrice = c => c.priceCents ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: c.currency }).format(c.priceCents / 100) : 'Gratis';


export function EventSetup({ event, close }) {
  const resource = useData(`/events/${event.id}/setup`), action = useAction(), [editing, setEditing] = useState(null), [editingMethod,setEditingMethod]=useState(null);
  return <Modal title={`Categorías y pagos · ${event.title}`} onClose={close} busy={action.busy}>
    <p>Cada participante se inscribe en una sola categoría por evento. Selecciona la disciplina en «Editar evento».</p>
    <Feedback state={action}/>
    <State resource={resource}>{data => <>
      {!data.editable && <p>Configuración de solo lectura. Los cambios se permiten en borradores editables sin inscripciones.</p>}
      <h3>Categorías</h3>
      {data.categories.length ? <Records items={data.categories} columns={[
        { label: 'Categoría', render: c => <>{c.name}{c.description && <p>{c.description}</p>}<p className="muted">{[c.modality,c.gender==='FEMALE'?'Femenino':c.gender==='MALE'?'Masculino':null,c.minAge!==null?`Desde ${c.minAge} años`:null,c.maxAge!==null?`Hasta ${c.maxAge} años`:null].filter(Boolean).join(' · ') || 'Sin restricciones'}</p></> },
        { label: 'Precio', render: categoryPrice }, { label: 'Cupo', render: c => c.capacity || 'Cupo del evento' },
        { label: 'Estado', render: c => c.active ? 'Activa' : 'Inactiva' },
      ]} actions={data.editable ? c => <button className="secondary" onClick={() => setEditing(c)}>Editar categoría</button> : undefined}/> : <p>No hay categorías configuradas. El evento conserva la inscripción gratuita general.</p>}
      {data.editable && !editing && <button className="secondary" onClick={() => setEditing({})}>Añadir categoría</button>}
      {data.editable && editing && <CategoryForm personal={!data.teamId} key={editing.id || 'new'} category={editing} action={action} cancel={() => setEditing(null)} save={values => action.run(async () => {
        await api(`/events/${event.id}/categories${editing.id ? '/' + editing.id : ''}`, editing.id ? 'PUT' : 'POST', values);
        setEditing(null); resource.reload();
      }, 'Categoría guardada.')}/>}
      <h3>Métodos habilitados</h3><p>{data.teamId?'Las cuentas se configuran en el Team.':'Configura Yape o Plin con el celular y nombre del receptor.'} Cada categoría de pago necesita un método activo de la misma moneda.</p>
      {!data.teamId && data.editable && <button className="secondary" onClick={()=>setEditingMethod({})}>Añadir Yape o Plin</button>}
      {!data.teamId && data.methods.map(m=><p key={m.id}>{m.label} · {m.holderName} · {m.phone}{data.editable && <button className="secondary" onClick={()=>setEditingMethod(m)}>Editar {m.label}</button>}</p>)}
      {!data.teamId && editingMethod && <MethodForm personal endpoint={'/events/'+event.id+'/payment-methods'} method={editingMethod} close={()=>setEditingMethod(null)} saved={()=>{setEditingMethod(null);resource.reload();}}/>}
      <form key={data.methodIds.join(',')} className="form" onSubmit={e => {
        e.preventDefault(); const methodIds = new FormData(e.currentTarget).getAll('methodIds');
        action.run(async () => { await api(`/events/${event.id}/payment-methods`, 'PUT', { methodIds }); resource.reload(); }, 'Métodos guardados.');
      }}>
        {data.methods.length ? data.methods.map(m => <label key={m.id} className="check"><input type="checkbox" name="methodIds" value={m.id} defaultChecked={data.methodIds.includes(m.id)} disabled={!data.editable || action.busy || (!m.active && !data.methodIds.includes(m.id))}/>{m.label} · {paymentTypes[m.type]} · {m.currency}{!m.active && ' · Inactivo (quítalo de la selección)'}</label>) : <p>Aún no hay métodos de pago configurados.</p>}
        {data.editable && <button disabled={action.busy}>Guardar métodos del evento</button>}
      </form>
    </>}</State>
  </Modal>;
}

function CategoryForm({ category: c, save, cancel, action, personal=false }) {
  return <form className="form card" onSubmit={e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget));
    v.priceCents = Math.round(Number(v.price) * 100); delete v.price;
    for (const key of ['capacity', 'minAge', 'maxAge']) v[key] = v[key] === undefined ? c[key] ?? null : v[key] === '' ? null : Number(v[key]);
    v.gender = v.gender === undefined ? c.gender ?? null : v.gender || null; v.active = v.active === 'on'; save(v);
  }}>
    <h4>{c.id ? 'Editar categoría' : 'Nueva categoría'}</h4>
    <Field label="Nombre" name="name" defaultValue={c.name} required maxLength={160}/>
    <Textarea label="Descripción (opcional)" name="description" defaultValue={c.description || ''} maxLength={2000}/>
    <div className="form-grid">
      <Field label="Precio (0 para gratis)" name="price" type="number" min="0" max="20000000" step="0.01" defaultValue={(c.priceCents || 0) / 100} required/>
      {personal ? <input type="hidden" name="currency" value="PEN"/> : <Currency value={c.currency}/>}
      <Field label="Cupo de categoría (opcional)" name="capacity" type="number" min="1" max="1000000" defaultValue={c.capacity || ''}/>
      {!personal && <><label>Género<select name="gender" defaultValue={c.gender || ''}><option value="">Sin restricción</option><option value="FEMALE">Femenino</option><option value="MALE">Masculino</option></select></label>
      <Field label="Edad mínima (opcional)" name="minAge" type="number" min="0" max="120" defaultValue={c.minAge ?? ''}/>
      <Field label="Edad máxima (opcional)" name="maxAge" type="number" min="0" max="120" defaultValue={c.maxAge ?? ''}/></>}
      <Field label="Modalidad (opcional)" name="modality" defaultValue={c.modality || ''} maxLength={100}/>
    </div>
    <label className="check"><input type="checkbox" name="active" defaultChecked={c.active ?? true}/>Activa</label>
    <div className="actions"><button disabled={action.busy}>Guardar categoría</button><button type="button" className="secondary" disabled={action.busy} onClick={cancel}>Cancelar categoría</button></div>
  </form>;
}
