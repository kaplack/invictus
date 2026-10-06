import React,{useId,useState} from 'react';
import {OutlineIcon} from './OutlineIcon.jsx';
export function IconAction({label,icon,href,...props}) {
 const id=useId(),[open,setOpen]=useState(false),Tag=href?'a':'button';
 return <span className="event-icon-action" onPointerEnter={()=>setOpen(true)} onPointerLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);}}}>
  <Tag {...props} {...(href?{href}:{type:'button'})} className="event-icon-button" aria-label={label} aria-describedby={open?id:undefined}><OutlineIcon name={icon}/></Tag>
  {open&&<span id={id} role="tooltip" className="event-action-tooltip">{label}</span>}
 </span>;
}
