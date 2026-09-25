import React, { useState } from 'react';
import { useData } from '../hooks/data.js';
import { State } from './UI.jsx';

export default function EventTeamField({ createTeamUrl }) {
  const [offset, setOffset] = useState(0), [selected, setSelected] = useState(null);
  const resource = useData(`/teams/event-options?offset=${offset}`);
  return <fieldset><legend>Team organizador</legend>
    <State resource={resource}>{data => <>
      <label>Selecciona un Team (obligatorio)<select name="teamId" required value={selected?.id || ''} onChange={e => setSelected(data.items.find(t => t.id === e.target.value) || (e.target.value ? selected : null))}>
        <option value="">Selecciona tu Team</option>
        {selected && !data.items.some(t => t.id === selected.id) && <option value={selected.id}>{selected.name}</option>}
        {data.items.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select></label>
      {!data.items.length && offset === 0 && <p>Necesitas ser propietario o administrador de un Team activo. <a className="text-link" href={createTeamUrl}>Crear o consultar mis Teams</a></p>}
      {(offset > 0 || data.nextOffset !== null) && <div className="actions">
        <button type="button" className="secondary" disabled={!offset} onClick={() => setOffset(offset - 20)}>Teams anteriores</button>
        <button type="button" className="secondary" disabled={data.nextOffset === null} onClick={() => setOffset(data.nextOffset)}>Más Teams</button>
      </div>}
    </>}</State>
    <small>Solo aparecen los Teams en los que puedes administrar eventos.</small>
  </fieldset>;
}
