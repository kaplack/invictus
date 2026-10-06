import React, {useState} from 'react';
import {useData,useAction} from '../hooks/data.js';
import {api} from '../services/api.js';
import {State,Feedback,Field,Textarea} from './UI.jsx';
import {OutlineIcon} from './OutlineIcon.jsx';
const blank=()=>({eventName:'',disciplineId:'',year:String(new Date().getFullYear()),eventDate:'',location:'',eventTest:'',category:'',result:'',position:'',organizer:'',description:'',officialUrl:''});
export function Trajectory({disabled}) {
 const history=useData('/profile/trajectory'),catalog=useData('/disciplines'),action=useAction();
 const [draft,setDraft]=useState(null),[editing,setEditing]=useState(null),[filter,setFilter]=useState(''),[confirm,setConfirm]=useState(null);
 const busy=disabled||action.busy;
 const change=key=>event=>setDraft(current=>({...current,[key]:event.target.value}));
 const edit=row=>{setEditing(row.id);setDraft(Object.fromEntries(Object.keys(blank()).map(key=>[key,key==='disciplineId'?row.discipline.id:String(row[key]??'')])));};
 async function save(event){event.preventDefault();if(busy)return;await action.run(async()=>{
  await api('/profile/trajectory'+(editing?'/'+editing:''),editing?'PUT':'POST',{...draft,year:Number(draft.year),position:draft.position?Number(draft.position):null});
  setDraft(null);setEditing(null);history.reload();
 },'Participación guardada.');}
 return <div className="profile-trajectory"><h2>Mi trayectoria</h2><p className="profile-intro">Tu historia deportiva empezó antes de Invictus. Registra tus participaciones anteriores.</p>
 <p className="trajectory-notice"><OutlineIcon name="info"/>Estas participaciones son declaradas por ti. Agregar un enlace no verifica el resultado.</p>
 {!draft && <button type="button" className="profile-save" disabled={busy} onClick={()=>{setEditing(null);setDraft(blank());}}>+ Agregar participación</button>}
 {draft && <form onSubmit={save} className="trajectory-form"><h3>{editing?'Editar participación':'Agregar participación'}</h3><fieldset disabled={busy}><legend className="profile-sr-only">Datos de la participación</legend>
 <Field label="Nombre del evento" required maxLength={160} value={draft.eventName} onChange={change('eventName')}/>
 <State resource={catalog}>{items=><label htmlFor="trajectory-discipline">Disciplina<select id="trajectory-discipline" aria-label="Disciplina" required value={draft.disciplineId} onChange={change('disciplineId')}><option value="">Selecciona una disciplina</option>{items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}{editing&&!items.some(item=>item.id===draft.disciplineId)&&<option value={draft.disciplineId}>{history.data?.find(item=>item.id===editing)?.discipline.name} (inactiva)</option>}</select></label>}</State>
 <div className="trajectory-grid"><Field label="Año" type="number" required min={1900} max={new Date().getFullYear()} value={draft.year} onChange={change('year')}/><Field label="Fecha exacta (opcional)" type="date" value={draft.eventDate} onChange={change('eventDate')}/></div>
 <details open={!!editing}><summary>Detalles opcionales</summary><div className="trajectory-grid">{[['location','Lugar',160],['eventTest','Prueba / distancia',120],['category','Categoría',120],['result','Marca / tiempo / resultado',120],['organizer','Organizador',160]].map(([key,label,max])=><Field key={key} label={label} maxLength={max} value={draft[key]} onChange={change(key)}/>)}<Field label="Posición" type="number" min={1} max={1000000} value={draft.position} onChange={change('position')}/></div><Field label="Enlace oficial" placeholder="https://…" maxLength={2048} value={draft.officialUrl} onChange={change('officialUrl')}/><Textarea label="Descripción" maxLength={2000} value={draft.description} onChange={change('description')}/></details>
 <div className="profile-actions"><button type="button" className="secondary" onClick={()=>{setDraft(null);setEditing(null);}}>Cancelar</button><button className="profile-save" disabled={catalog.loading||!!catalog.error}><OutlineIcon name="save"/>{action.busy?'Guardando…':'Guardar participación'}</button></div>
 </fieldset></form>}
 <Feedback state={action}/><State resource={history}>{rows=>{
  const disciplines=[...new Map(rows.map(row=>[row.discipline.id,row.discipline])).values()];
  const visible=rows.filter(row=>!filter||row.discipline.id===filter);
  const years=[...new Set(visible.map(row=>row.year))];
  return <>{rows.length>0&&<label htmlFor="trajectory-filter">Filtrar por disciplina<select id="trajectory-filter" aria-label="Filtrar por disciplina" value={filter} onChange={event=>setFilter(event.target.value)}><option value="">Todas las disciplinas</option>{disciplines.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
  {!rows.length&&<p className="trajectory-empty">Agrega tu primera participación. No necesitas haber competido en un evento de Invictus.</p>}
  {rows.length>0&&!visible.length&&<p>No hay participaciones para esta disciplina.</p>}
  {years.map(year=><section className="trajectory-year" key={year}><h3>{year}</h3>{visible.filter(row=>row.year===year).map(row=><article className="trajectory-entry" key={row.id}><h4>{row.eventName}</h4><p>{row.discipline.name}{row.eventTest?' · '+row.eventTest:''}</p><span className="trajectory-declared">Declarado por el deportista</span><p className="trajectory-date">{row.eventDate?new Date(row.eventDate+'T12:00:00Z').toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'Fecha exacta no indicada'}{row.location?' · '+row.location:''}</p>
 {(row.result||row.position||row.category)&&<p>{[row.result,row.position?row.position+'.º puesto':null,row.category].filter(Boolean).join(' · ')}</p>}
 {row.organizer&&<p>Organizador: {row.organizer}</p>}{row.description&&<p className="trajectory-description">{row.description}</p>}
 {row.officialUrl&&<a href={row.officialUrl} target="_blank" rel="noopener noreferrer">Consultar enlace oficial ↗</a>}
 <div className="trajectory-entry-actions">{confirm===row.id?<><span>¿Eliminar esta participación?</span><button type="button" className="secondary" disabled={busy} onClick={()=>action.run(async()=>{await api('/profile/trajectory/'+row.id,'DELETE',{});setConfirm(null);if(editing===row.id){setDraft(null);setEditing(null);}history.reload();},'Participación eliminada.')}>Confirmar eliminación</button><button type="button" className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancelar</button></>:<><button type="button" className="secondary" disabled={busy} aria-label={'Editar '+row.eventName} onClick={()=>edit(row)}>Editar</button><button type="button" className="secondary" disabled={busy} aria-label={'Eliminar '+row.eventName} onClick={()=>setConfirm(row.id)}>Eliminar</button></>}</div>
 </article>)}</section>)}
 </>;
 }}</State></div>;
}
