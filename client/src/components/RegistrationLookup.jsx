import CompetitorNumber from './CompetitorNumber.jsx';
import React, {useState} from 'react';
import {api} from '../services/api.js';
import {RegistrationStatus} from './CategoryRegistration.jsx';
import {classificationLabel} from '../helpers/registration-classification.js';
import '../styles/guest-registration.css';

export function RegistrationIcon({type='search'}) {
 const paths={search:<><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,ticket:<><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Z"/><path d="M15 5v14"/></>,user:<><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></>,link:<><path d="m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1"/></>,file:<><path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6"/></>};
 return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[type]||paths.ticket}</svg>;
}
export default function RegistrationLookup(){
 const [code,setCode]=useState(''),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <section className="registration-lookup" aria-labelledby="lookup-title">
  <div className="lookup-heading"><RegistrationIcon/><div><h2 id="lookup-title">Consultar mi inscripción</h2><p>Ingresa tu código para ver el estado.</p></div></div>
  <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setResult(null);try{setResult(await api('/registration-status','POST',{code}));}catch(e){setError(e.message);}finally{setBusy(false);}}}>
   <label><span className="sr-only">Código de inscripción</span><input required maxLength={40} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="INV-XXXX-XXXX-XXXX-XXXX" value={code} onChange={e=>{setCode(e.target.value);setResult(null);setError('');}}/></label>
   <button disabled={busy}><RegistrationIcon/>{busy?'Consultando…':'Consultar'}</button>
  </form>
  {error&&<p role="alert" className="error">{error}</p>}
  {result&&<div className="lookup-result" role="status"><strong>{result.event.title}</strong><RegistrationStatus status={result.status}/><CompetitorNumber number={result.competitorNumber} compact/><p>{classificationLabel(result.categorySnapshot)}</p><div className="lookup-actions"><a className="button" href={"/constancia/"+encodeURIComponent(result.code)}><RegistrationIcon type="ticket"/>Ver constancia</a><a href={'/eventos/'+result.event.publicSlug}>Ver evento ↗</a></div><small>Para ver comprobantes o corregir datos, usa tu enlace privado.</small></div>}
 </section>;
}
