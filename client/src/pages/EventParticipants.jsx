import React from 'react';
import { useData } from '../hooks/data.js';
import { State } from '../components/UI.jsx';
import EventRegistrations from '../components/EventRegistrations.jsx';
import '../styles/registrations.css';
import '../styles/event-participants.css';

export default function EventParticipants({id}) {
 const resource=useData('/events/mine/'+id);
 return <section className="registrations-page event-participants">
  <a className="participants-back" href="/mis-eventos">← Mis eventos</a>
  <State resource={resource}>{event=><>
   <header className="registrations-heading"><p>GESTIÓN DEL EVENTO</p><h1>Inscripciones</h1><span>{event.title}</span></header>
   <section className="registrations-panel" aria-label="Participantes del evento"><EventRegistrations event={event} embedded/></section>
  </>}</State>
 </section>;
}
