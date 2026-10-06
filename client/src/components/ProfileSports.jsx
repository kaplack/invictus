import React, { useState } from 'react';
import { useData, useAction } from '../hooks/data.js';
import { saveProfile } from '../services/profile.js';
import { State, Feedback } from './UI.jsx';
import { OutlineIcon } from './OutlineIcon.jsx';
export function IdentitySports({profile}) {
 if(!profile?.disciplines?.length)return null;
 return <div className="profile-identity-sports"><h4>Mis deportes</h4><ul>{profile.disciplines.map(sport=><li key={sport.id}><OutlineIcon name="sport"/><span>{sport.name}</span>{sport.isPrimary && <small>Principal</small>}</li>)}</ul></div>;
}
export function ProfileSports({profile,onSaved,disabled}) {
 const catalog=useData('/disciplines'),action=useAction();
 const [selected,setSelected]=useState(profile?.disciplines || []),[query,setQuery]=useState('');
 const busy=disabled || action.busy;
 function add(sport) {
  setSelected(current=>current.some(row=>row.id===sport.id) || current.length>=20 ? current : [...current,{...sport,active:true,isPrimary:current.length===0}]);
 }
 return <form className="profile-sports" onSubmit={event=>{event.preventDefault();if(busy)return;
  action.run(async()=>{
   const result=await saveProfile({disciplines:selected.map(sport=>({disciplineId:sport.id,isPrimary:sport.isPrimary}))});
   setSelected(result.disciplines);onSaved(result);
  },'Deportes guardados.');
 }}>
  <h2>Mis deportes</h2><p className="profile-intro">Selecciona los deportes que practicas. Puedes indicar uno como principal.</p>
  <fieldset disabled={busy}><legend className="profile-sr-only">Selección de deportes</legend>
   <label htmlFor="profile-sports-search">Buscar deporte</label><div className="profile-input"><input id="profile-sports-search" placeholder="Buscar deporte…" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off"/></div>
   <h3>Deportes disponibles</h3><State resource={catalog}>{items=>{
    const filtered=items.filter(sport=>sport.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    return filtered.length ? <div className="profile-sports-catalog">{filtered.map(sport=>{const added=selected.some(row=>row.id===sport.id);
     return <button key={sport.id} type="button" className={'profile-sport-option'+(added?' is-selected':'')}
      aria-pressed={added} aria-label={(added?'Seleccionado: ':'Agregar ')+sport.name} disabled={!added && selected.length>=20}
      onClick={()=>add(sport)}><OutlineIcon name="sport"/><span>{sport.name}</span><span aria-hidden="true">{added?'✓':'+'}</span></button>;
    })}</div> : <p role="status" className="profile-sports-empty">{query.trim()?'No encontramos deportes con ese nombre.':'No hay deportes disponibles por ahora.'}</p>;
   }}</State>
   <h3>Tus deportes</h3>
   {selected.length ? <ul className="profile-sports-selected">{selected.map(sport=><li key={sport.id}>
    <div className="profile-sport-name"><OutlineIcon name="sport"/><span>{sport.name}{sport.active===false && <small>Ya no está disponible en el catálogo.</small>}</span></div>
    <div className="profile-sport-actions">{sport.isPrimary ? <><span className="profile-sport-primary">Principal</span><button type="button" className="secondary" onClick={()=>setSelected(rows=>rows.map(row=>({...row,isPrimary:false})))}>Quitar principal</button></>
     : <button type="button" className="secondary" aria-label={'Marcar '+sport.name+' como principal'} onClick={()=>setSelected(rows=>rows.map(row=>({...row,isPrimary:row.id===sport.id})))}>Marcar como principal</button>}
     <button type="button" className="secondary profile-sport-remove" aria-label={'Eliminar '+sport.name} title={'Eliminar '+sport.name} onClick={()=>setSelected(rows=>rows.filter(row=>row.id!==sport.id))}>×</button>
    </div></li>)}</ul> : <p className="profile-sports-empty">Aún no has seleccionado deportes.</p>}
   <div className="profile-actions"><button className="profile-save" disabled={catalog.loading || !!catalog.error}><OutlineIcon name="save"/>{action.busy?'Guardando…':'Guardar deportes'}</button></div>
  </fieldset><Feedback state={action}/>
 </form>;
}
