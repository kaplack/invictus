import React,{useState} from 'react';
import {useData} from '../hooks/data.js';
import {State} from '../components/UI.jsx';
import {EventCards} from '../components/EventCards.jsx';
import '../styles/public-events.css';
import '../styles/events-home.css';
import '../styles/landing.css';

function Arrow(){return <span aria-hidden="true">↗</span>;}
function SportIcon({type}) {
 return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{type==='team'?<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/></>:type==='event'?<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 2 2 5-4"/></>:<><path d="M7 3h10v5a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 1v6m-4 2h8"/></>}</svg>;
}
export function LegacyLanding(){
 return <div className="landing">
  <section className="landing-hero" aria-labelledby="landing-title">
   <img className="landing-hero-photo" src="/images/landing-swimmer.png" alt="" fetchPriority="high" width="1916" height="821"/>
   <div className="landing-hero-shade"/>
   <div className="landing-hero-content">
    <p className="landing-kicker"><span/> HECHOS PARA IR MÁS ALLÁ</p>
    <h1 id="landing-title">TU EQUIPO<br/>MUEVE<br/><em>GRANDES<br/>HISTORIAS.</em></h1>
    <p className="landing-description">Gestiona tu Team, organiza eventos<br className="landing-desktop-break"/> y conecta con la comunidad deportiva.</p>
    <div className="landing-actions"><a className="button landing-primary" href="/mis-teams">Comienza tu Team <Arrow/></a><a className="landing-explore" href="/eventos">Explorar eventos <span aria-hidden="true">→</span></a></div>
   </div>
   <div className="landing-hero-caption"><span>EL DESAFÍO ES PERSONAL.</span><strong>La historia se construye en equipo.</strong></div>
  </section>
  <section className="landing-paths" aria-labelledby="landing-paths-title">
   <div className="landing-section-heading"><div><p className="landing-kicker">TU SIGUIENTE PASO</p><h2 id="landing-paths-title">Un equipo. Infinitas posibilidades.</h2></div><p>Participa, organiza y reconoce<br/>todo lo que los une.</p></div>
   <div className="landing-card-grid">
    <a className="landing-feature landing-feature-team" href="/teams"><div className="landing-feature-content"><SportIcon type="team"/><p className="landing-card-label">01 / TEAM</p><h3>Gestiona tu Team.</h3><p>Reúne a tu comunidad y organiza la información del equipo en un solo lugar.</p><span className="landing-card-action">Encontrar un Team <Arrow/></span></div></a>
    <a className="landing-feature landing-feature-event" href="/eventos"><div className="landing-feature-content"><SportIcon type="event"/><p className="landing-card-label">02 / EVENTOS</p><h3>Encuentra tu desafío.</h3><p>Explora eventos, elige tu próximo reto y da el primer paso para participar.</p><span className="landing-card-action">Explorar eventos <Arrow/></span></div></a>
    <a className="landing-feature landing-feature-award" href="/tienda"><div className="landing-feature-content"><SportIcon type="award"/><p className="landing-card-label">03 / RECONOCIMIENTOS</p><h3>El esfuerzo toma forma.</h3><p>Medallas, trofeos y reconocimientos para las historias que merecen quedarse.</p><span className="landing-card-action">Visitar la tienda <Arrow/></span></div></a>
   </div>
  </section>
 </div>;
}

const searchable=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export default function Landing(){
 const events=useData('/events?upcoming=1'),[query,setQuery]=useState('');
 const term=searchable(query.trim());
 return <div className="events-home">
  <section className="events-home-hero" aria-labelledby="home-title">
   <div className="events-home-intro">
    <h1 id="home-title">Encuentra eventos<span className="hero-mobile-break"><br/></span><span className="hero-desktop-space"> </span>deportivos<br/><em>e inscríbete fácilmente.</em></h1>
    <div className="events-home-actions"><a className="button" href="#proximos-eventos">Explorar eventos <span aria-hidden="true">↓</span></a><a className="button secondary" href="/mis-eventos?crear=1">Crear evento <span aria-hidden="true">↗</span></a></div>
   </div>
  </section>
  <section id="proximos-eventos" className="public-events events-home-list" aria-labelledby="home-events-title">
   <div className="events-home-list-heading"><h2 id="home-events-title">Próximos eventos</h2><label className="events-home-search"><span className="sr-only">Buscar eventos</span><input type="search" placeholder="Busca un evento, lugar o disciplina" value={query} onChange={e=>setQuery(e.target.value)} maxLength={120}/></label></div>
   <State resource={events}>{items=>{const found=items.filter(event=>!term || searchable([event.title,event.venue,event.discipline?.name,event.publicOrganizerName,event.team?.name].filter(Boolean).join(' ')).includes(term));return <>
    {term&&<p role="status" className="events-home-results">{found.length} {found.length===1?'evento encontrado':'eventos encontrados'}</p>}
    {found.length?<EventCards events={found}/>:<div className="empty"><p>{term?'No encontramos eventos con esa búsqueda.':'Pronto encontrarás nuevos eventos aquí.'}</p>{term?<button className="secondary" onClick={()=>setQuery('')}>Limpiar búsqueda</button>:<a className="button" href="/mis-eventos?crear=1">Crear un evento</a>}</div>}
   </>;}}</State>
  </section>
 </div>;
}
