import React from 'react';
import {OutlineIcon} from './OutlineIcon.jsx';
import {whatsappDestination} from '../helpers/whatsapp.js';
export default function OrganizerWhatsApp({event,code,className="receipt-whatsapp",label="Contactar al organizador"}){
 const destination=whatsappDestination(event.publicOrganizerPhone);
 if(!destination)return null;
 const message=code?`Hola, quisiera consultar sobre mi inscripción al evento ${event.title}. Mi código es ${code}.`:`Hola, tengo una consulta sobre el evento ${event.title}.`;
 return <a className={"button secondary "+className} aria-label={label} title={label} href={'https://wa.me/'+destination+'?text='+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer"><OutlineIcon name="whatsapp"/><span>{label}</span></a>;
}
