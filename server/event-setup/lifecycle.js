export function personalLifecycle(event,registrations=0,now=new Date()) {
 const started=!!event.startsAt&&new Date(event.startsAt)<=now;
 const hasRegistrations=registrations>0;
 const mutable=['DRAFT','PUBLISHED'].includes(event.status);
 const publicationBlockReason=!mutable?'El evento está cerrado.':started?'La fecha de inicio ya se alcanzó: no puedes publicar ni despublicar.':event.status==='PUBLISHED'&&hasRegistrations?'El evento tiene inscripciones: no puedes despublicarlo.':null;
 const displayLabel=event.status==='DRAFT'&&(started||hasRegistrations)?(started?'Histórico · no publicado':'Despublicado con inscripciones'):null;
 return {displayLabel,started,hasRegistrations,registrationCount:registrations,conditionsLocked:started||hasRegistrations||!mutable,publicationBlockReason};
}
