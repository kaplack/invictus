import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { Field, Textarea, State, Feedback, Records } from './UI.jsx';
import { Currency, paymentTypes } from './EventSetup.jsx';
import { useAction, useData } from '../hooks/data.js';
import { api, upload } from '../services/api.js';

export default function TeamPaymentMethods({ team }) {
  const resource = useData(`/teams/${team.id}/payment-methods`), [editing, setEditing] = useState(null);
  const owner = team.role === 'OWNER';
  return <section className="team-members"><h2>Cuentas y medios disponibles</h2><p>Los propietarios configuran las cuentas. Los administradores pueden seleccionarlas en los eventos.</p>
    {owner && <button onClick={() => setEditing({})}>Añadir método de cobro</button>}
    <State resource={resource}>{items => items.length ? <Records items={items} columns={[
      { label: 'Etiqueta', render: m => m.label }, { label: 'Tipo', render: m => paymentTypes[m.type] },
      { label: 'Cuenta', render: m => <>{m.holderName}<br/>{m.phone || m.accountNumber || m.instructions}</> },
      { label: 'Moneda', render: m => m.currency }, { label: 'Estado', render: m => m.active ? 'Activo' : 'Inactivo' },
    ]} actions={owner ? m => <button className="secondary" onClick={() => setEditing(m)}>Editar método</button> : undefined}/> : <p>No hay métodos de cobro registrados.</p>}</State>
    {editing && <MethodForm key={editing.id || 'new'} team={team} method={editing} close={() => setEditing(null)} saved={() => { setEditing(null); resource.reload(); }}/ >}
  </section>;
}

function MethodForm({ team, method: m, close, saved }) {
  const action = useAction(), [type, setType] = useState(m.type || 'YAPE'), [qr, setQr] = useState(null);
  const mobile = ['YAPE', 'PLIN'].includes(type);
  return <Modal title={m.id ? 'Editar método de cobro' : 'Nuevo método de cobro'} onClose={close} busy={action.busy}>
    <form className="form" onSubmit={e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget));
      v.type = type; v.active = v.active === 'on'; v.qrFileId = v.removeQr ? null : m.qrFileId || null; delete v.removeQr;
      action.run(async () => {
        if (qr && mobile) v.qrFileId = (await upload(qr, 'private')).id;
        if (!mobile) v.qrFileId = null;
        await api(`/teams/${team.id}/payment-methods${m.id ? '/' + m.id : ''}`, m.id ? 'PUT' : 'POST', v); saved();
      });
    }}>
      <label>Tipo<select value={type} disabled={!!m.id} onChange={e => setType(e.target.value)}>{Object.entries(paymentTypes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <Field label="Etiqueta (ej. Yape tesorería)" name="label" required maxLength={120} defaultValue={m.label}/>
      {type !== 'CASH' && <Field label="Titular" name="holderName" required maxLength={120} defaultValue={m.holderName || ''}/>}
      {mobile && <Field label="Celular peruano (9 dígitos)" name="phone" type="tel" pattern="9[0-9]{8}" required defaultValue={m.phone || ''}/>}
      {type === 'BANK_TRANSFER' && <><Field label="Banco" name="bank" required maxLength={120} defaultValue={m.bank || ''}/><Field label="Número de cuenta" name="accountNumber" required maxLength={40} defaultValue={m.accountNumber || ''}/><Field label="CCI (opcional, 20 dígitos)" name="cci" pattern="[0-9]{20}" defaultValue={m.cci || ''}/></>}
      {mobile ? <><input type="hidden" name="currency" value="PEN"/><p>Yape y Plin: soles (PEN).</p><label>QR privado opcional · PNG, JPG o WebP, hasta 10 MB<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setQr(e.target.files[0] || null)}/></label>{m.qrFileId && <label className="check"><input type="checkbox" name="removeQr" disabled={!!qr}/>Quitar QR actual</label>}</> : <Currency value={m.currency}/>}
      <Textarea label={type === 'CASH' ? 'Instrucciones para pagar en efectivo' : 'Instrucciones (opcional)'} name="instructions" required={type === 'CASH'} maxLength={2000} defaultValue={m.instructions || ''}/>
      <label className="check"><input type="checkbox" name="active" defaultChecked={m.active ?? true}/>Activo</label>
      <Feedback state={action}/><div className="actions"><button disabled={action.busy}>Guardar método</button><button className="secondary" type="button" disabled={action.busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}
