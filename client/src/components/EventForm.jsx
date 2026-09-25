import React, { useState } from 'react';
import { Modal } from './Modal.jsx';
import { Field, Textarea, Feedback } from './UI.jsx';
import EventTeamField from './EventTeamField.jsx';
import { useAction } from '../hooks/data.js';
import { api, upload } from '../services/api.js';

export function EventForm({ event, close, saved, endpoint = '/events/manage' }) {
  const action = useAction(), [image, setImage] = useState(null);
  const teamsUrl = endpoint === '/events/mine' ? '#/mis-teams' : `${import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173'}/#/mis-teams`;
  return <Modal title={event.id ? 'Editar evento' : 'Nuevo evento'} onClose={close} busy={action.busy}>
    <form className="form event-modal-form" onSubmit={e => {
      e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget));
      values.startsAt = new Date(values.startsAt + '-05:00').toISOString();
      values.timeZone = 'America/Lima'; values.maxCapacity = Number(values.maxCapacity);
      action.run(async () => {
        if (!event.id && !values.teamId) throw new Error('Selecciona un Team para crear el evento.');
        if (image) values.primaryImageFileId = (await upload(image, 'public')).id;
        await api(endpoint + (event.id ? '/' + event.id : ''), event.id ? 'PATCH' : 'POST', values); saved();
      }, 'Evento guardado.');
    }}>
      {event.id ? <p><strong>Team organizador:</strong> {event.team?.name || 'Pendiente de asignación'}</p> : <EventTeamField createTeamUrl={teamsUrl}/>}
      <Field label="Título" name="title" defaultValue={event.title} required maxLength="180"/>
      <Textarea label="Descripción" name="description" defaultValue={event.description} required/>
      <div className="form-grid">
        <Field label="Fecha y hora de Lima" name="startsAt" type="datetime-local" defaultValue={event.startsAt ? new Date(new Date(event.startsAt).getTime() - 5 * 3600000).toISOString().slice(0, 16) : ''} required/>
        <Field label="Lugar" name="venue" defaultValue={event.venue} required/>
        <Field label="Cupo máximo" name="maxCapacity" type="number" min="1" max="1000000" defaultValue={event.configuration?.maxCapacity || 50} required/>
      </div>
      <small>El cupo queda fijo tras la primera inscripción.</small>
      <label>Imagen pública (opcional, PNG/JPG/WebP, hasta 10 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setImage(e.target.files[0])}/></label>
      <div className="actions"><button disabled={action.busy}>Guardar evento</button><button className="secondary" type="button" disabled={action.busy} onClick={close}>Cancelar</button></div>
      <Feedback state={action}/>
    </form>
  </Modal>;
}
