import React, { useState } from 'react';
import { socialPlatforms } from '../features/social.js';
import { saveProfile } from '../services/profile.js';
import { useAction } from '../hooks/data.js';
import { Feedback } from './UI.jsx';
import { OutlineIcon } from './OutlineIcon.jsx';
const valuesFor = profile => Object.fromEntries((profile?.socialLinks || []).map(link=>[link.platform,link.url]));
export function IdentityLinks({profile}) {
 const links = [ ...(profile?.websiteUrl ? [{label:'Sitio web',icon:'globe',url:profile.websiteUrl}] : []),
  ...socialPlatforms.filter(item=>profile?.socialLinks?.some(link=>link.platform===item.platform)).map(item=>({...item,url:profile.socialLinks.find(link=>link.platform===item.platform).url})) ];
 if(!links.length)return null;
 return <nav className="profile-social-icons" aria-label="Enlaces de presencia digital">{links.map(link=><a key={link.label} href={link.url} aria-label={link.label} title={link.label} target="_blank" rel="noopener noreferrer"><OutlineIcon name={link.icon}/></a>)}</nav>;
}
export function DigitalPresence({profile,onSaved,disabled}) {
 const [website,setWebsite]=useState(profile?.websiteUrl || '');
 const [values,setValues]=useState(()=>valuesFor(profile));
 const action=useAction();
 const rows=[{platform:'website',label:'Sitio web',icon:'globe',placeholder:'https://tu-sitio.com'},...socialPlatforms];
 return <form className="profile-digital" onSubmit={event=>{event.preventDefault();if(action.busy || disabled)return;
  action.run(async()=>{
   const result=await saveProfile({websiteUrl:website,socialLinks:socialPlatforms.map(item=>({platform:item.platform,url:values[item.platform] || ''}))});
   setWebsite(result.websiteUrl || '');setValues(valuesFor(result));onSaved(result);
  },'Enlaces guardados.');
 }}>
  <h2>Presencia digital</h2><p className="profile-intro">Comparte tus redes y página web.</p>
  <p className="profile-digital-notice"><OutlineIcon name="info"/>Los enlaces que agregues aquí podrán mostrarse en tu perfil público.</p>
  <fieldset disabled={disabled || action.busy}><legend className="profile-sr-only">Enlaces opcionales</legend>
   {rows.map((item,index)=>{const error=action.error.startsWith(item.label+':')?action.error:'';
    return <React.Fragment key={item.platform}>{index===1 && <h3>Redes sociales</h3>}
     <div className="profile-social-row"><label htmlFor={'digital-'+item.platform}><OutlineIcon name={item.icon}/>{item.label}</label>
      <div><input id={'digital-'+item.platform} value={item.platform==='website'?website:values[item.platform] || ''}
       onChange={event=>item.platform==='website'?setWebsite(event.target.value):setValues(current=>({...current,[item.platform]:event.target.value}))}
       placeholder={item.placeholder} maxLength={2048} autoComplete="off" autoCapitalize="none" spellCheck={false}
       aria-invalid={!!error} aria-describedby={error?'digital-error-'+item.platform:undefined}/>
       {error && <small className="profile-link-error" id={'digital-error-'+item.platform}>{error}</small>}
      </div></div></React.Fragment>;
   })}
   <div className="profile-actions"><button className="profile-save"><OutlineIcon name="save"/>{action.busy?'Guardando…':'Guardar enlaces'}</button></div>
  </fieldset><Feedback state={action}/>
 </form>;
}
