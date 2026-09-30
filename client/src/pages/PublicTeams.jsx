import React, {useState} from 'react';
import {useData} from '../hooks/data.js';
import {fileUrl} from '../services/api.js';
import {State} from '../components/UI.jsx';
import '../styles/public-teams.css';
const policies={OPEN:'Ingreso abierto',APPROVAL:'Por aprobación',INVITE:'Por invitación'};
function Identity({team}) {return <div className="public-team-identity">{team.logoFileId?<img src={fileUrl(team.logoFileId)} alt="" loading="lazy"/>:<span className="public-team-initial" aria-hidden="true">{team.name.slice(0,1).toUpperCase()}</span>}<div><p className="public-team-label">TEAM</p><h2>{team.name}</h2></div></div>;}
export default function PublicTeams({id}) {
 const [draft,setDraft]=useState(''),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const [disciplineId,setDisciplineId]=useState(''),[sort,setSort]=useState('name-asc');
 const sports=useData('/disciplines');
 const filtersActive=!!(query||disciplineId);
 const clearFilters=()=>{setQuery('');setDraft('');setDisciplineId('');setOffset(0);};
 const resource=useData(id?`/teams/public/${encodeURIComponent(id)}`:`/teams/public?q=${encodeURIComponent(query)}&offset=${offset}&sort=${sort}${disciplineId?`&disciplineId=${encodeURIComponent(disciplineId)}`:''}`);
 return <div className="public-teams">
  {id?<><a className="public-team-back" href="#/teams">← Explorar Teams</a><State resource={resource}>{team=><article className="public-team-detail"><p className="landing-kicker">COMUNIDAD INVICTUS</p><h1>{team.name}</h1><Identity team={team}/><span className="public-team-policy">{policies[team.joinPolicy]}</span><p className="public-team-description">{team.description||'Este equipo todavía no ha agregado una presentación.'}</p><p className="public-team-note">{team.joinPolicy==='OPEN'?'Este equipo permite el ingreso directo de usuarios registrados.':team.joinPolicy==='APPROVAL'?'El equipo revisa las solicitudes antes de incorporar nuevos miembros.':'Para incorporarte necesitas recibir una invitación del equipo.'}</p><a className="button public-teams-secondary" href="#/mis-teams">Acceder a Teams <span aria-hidden="true">↗</span></a></article>}</State></>:<>
  <header className="public-teams-intro"><div><p className="landing-kicker">ENCUENTRA TU COMUNIDAD</p><h1>El próximo desafío<br/>empieza <em>en equipo.</em></h1><p>Conoce los Teams registrados en Invictus. Encuentra personas que comparten<br className="public-teams-break"/> tu pasión y descubre dónde empieza tu próxima historia.</p></div><a className="button public-teams-create" href="#/mis-teams">Comienza tu Team <span aria-hidden="true">↗</span></a></header>
  <form role="search" className="public-teams-search" onSubmit={e=>{e.preventDefault();setQuery(draft.trim());setOffset(0);}}><label htmlFor="team-search">Buscar por nombre</label><div><svg className="public-teams-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="team-search" type="search" placeholder="Buscar Teams por nombre…" maxLength={120} value={draft} onChange={e=>setDraft(e.target.value)}/><button type="submit">Buscar</button></div></form>
  <section aria-labelledby="public-teams-title">
    <div className="public-teams-toolbar">
      <div><h2 id="public-teams-title">Explora los Teams</h2><p>Equipos que abren sus puertas a la comunidad.</p></div>
      <div className="public-teams-filters">
        <label>Deporte<select value={disciplineId} disabled={sports.loading||!!sports.error} onChange={e=>{setDisciplineId(e.target.value);setOffset(0);}}>
          <option value="">{sports.loading?'Cargando deportes…':'Todos los deportes'}</option>
          {(sports.data||[]).map(sport=><option key={sport.id} value={sport.id}>{sport.name}</option>)}
        </select></label>
        <label>Ordenar por<select value={sort} onChange={e=>{setSort(e.target.value);setOffset(0);}}>
          <option value="name-asc">Nombre A–Z</option><option value="name-desc">Nombre Z–A</option>
          <option value="recent">Más recientes</option><option value="members">Más miembros</option>
        </select></label>
      </div>
    </div>
    {sports.error&&<p role="alert">No pudimos cargar los deportes. <button className="link-button" onClick={sports.reload}>Reintentar</button></p>}
  {filtersActive&&<div className="public-teams-query"><span>{query?`Resultados para “${query}”`:'Teams por deporte'}{disciplineId&&` · ${sports.data?.find(sport=>sport.id===disciplineId)?.name||'Deporte seleccionado'}`}</span><button className="link-button" onClick={clearFilters}>Limpiar filtros</button></div>}
  <State resource={resource}>{data=><>{data.items.length?<div className="public-team-grid">{data.items.map(team=><article className="public-team-card" key={team.id}><div className="public-team-banner" aria-hidden="true">{team.bannerFileId && <img src={fileUrl(team.bannerFileId)} alt="" loading="lazy"/>}</div><div className="public-team-card-body"><Identity team={team}/>{team.disciplines.length>0&&<p className="public-team-sports">{team.disciplines.map(sport=>sport.name).join(' · ')}</p>}<p className="public-team-excerpt">{team.description||'Un espacio para compartir desafíos y vivir el deporte en equipo.'}</p><p className="public-team-member-count">{team.memberCount} {team.memberCount===1?'miembro':'miembros'}</p><span className="public-team-policy">{policies[team.joinPolicy]}</span><a href={`#/teams/${team.id}`} className="public-team-link" aria-label={`Ver Team ${team.name}`}>Ver Team <span aria-hidden="true">↗</span></a></div></article>)}</div>:<div className="empty"><h3>{filtersActive?'No encontramos equipos con esos criterios.':'La comunidad está tomando forma.'}</h3><p>{filtersActive?'Prueba otro nombre, cambia el deporte o limpia los filtros.':'Aquí aparecerán los Teams que habiliten su visibilidad pública.'}</p>{!filtersActive&&<a className="button public-teams-create" href="#/mis-teams">Comienza tu Team</a>}</div>}{(offset>0||data.nextOffset!==null)&&<nav className="public-teams-pagination" aria-label="Páginas de Teams"><button className="public-teams-secondary" disabled={!offset} onClick={()=>setOffset(offset-20)}>Anterior</button><span>Página {offset/20+1}</span><button className="public-teams-secondary" disabled={data.nextOffset===null} onClick={()=>setOffset(data.nextOffset)}>Siguiente</button></nav>}</>}</State>
  </section></>}
 </div>;
}
