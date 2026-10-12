import OrganizerWhatsApp from './OrganizerWhatsApp.jsx';
import React,{useEffect,useState} from 'react';
import {api} from '../services/api.js';
import {State} from './UI.jsx';
import {RegistrationStatus} from './CategoryRegistration.jsx';
import {classificationLabel} from '../helpers/registration-classification.js';
import CompetitorNumber from './CompetitorNumber.jsx';
import '../styles/guest-registration.css';
export default function PublicRegistrationReceipt({code}){
 const [resource,setResource]=useState({loading:true,data:null,error:''});
 useEffect(()=>{let active=true;setResource({loading:true,data:null,error:''});api('/registration-status','POST',{code}).then(data=>{if(active)setResource({loading:false,data,error:''});}).catch(e=>{if(active)setResource({loading:false,data:null,error:e.message});});return()=>{active=false;};},[code]);
 return <section className="guest-receipt"><a className="receipt-back" href="/">← Inicio</a><h1>Constancia de inscripción</h1><State resource={resource}>{data=><article className="receipt-card"><header><span className="receipt-kicker">INVICTUS · INSCRIPCIÓN</span><h2>{data.event.title}</h2><RegistrationStatus status={data.status}/></header><CompetitorNumber number={data.competitorNumber}/><dl className="receipt-summary"><div><dt>Categoría</dt><dd>{classificationLabel(data.categorySnapshot)}</dd></div></dl><p className="public-receipt-code">Código: <strong>{data.code}</strong></p>{!data.competitorNumber&&<p className="receipt-note">El número de competidor se asigna cuando el organizador acepta tu inscripción.</p>}<div className="receipt-private"><p>Para ver tus datos personales, comprobantes o corregir tu inscripción, usa el enlace privado que recibiste al inscribirte.</p></div><OrganizerWhatsApp event={data.event} code={data.code}/><div className="receipt-actions"><a href={'/eventos/'+data.event.publicSlug}>Ver evento ↗</a><a href="/">Consultar otra inscripción</a></div></article>}</State></section>;
}
