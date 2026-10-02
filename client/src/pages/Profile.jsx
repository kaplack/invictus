import React, { useRef, useState } from 'react';
import { fileUrl } from '../services/api.js';
import { useData } from '../hooks/data.js';
import { useProfileEditor } from '../hooks/profile.js';
import { useUsernameAvailability } from '../hooks/username.js';
import { State, Feedback } from '../components/UI.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import '../styles/profile.css';

const tabs = ['Información','Contacto','Presencia digital','Deportes','Trayectoria'];
const emptyCopy = {
  'Presencia digital':'Aquí podrás añadir tu sitio web y tus perfiles en redes sociales.',
  Deportes:'Aquí podrás organizar las disciplinas que practicas.',
  Trayectoria:'Aquí se reunirán tus participaciones y resultados verificados en Invictus.'
};
export function Account({user,onSession}) {
  const resource = useData('/profile');
  return <section className="profile-page"><State resource={resource}>{profile =>
    <ProfileEditor profile={profile} user={user} onSession={onSession}/>
  }</State></section>;
}
function ProfileField({label,name,value,onChange,children,...props}) {
  const id = 'profile-'+name;
  return <div className="profile-field"><label htmlFor={id}>{label}</label>
    <div className="profile-input">{children
      ? <select id={id} name={name} value={value} onChange={onChange} {...props}>{children}</select>
      : <input id={id} name={name} value={value} onChange={onChange} {...props}/>}</div>
  </div>;
}
function ProfileEditor({profile,user,onSession}) {
  const editor = useProfileEditor(profile,user,onSession);
  const {saved,info,setInfo,contact,setContact,avatar,banner,busy} = editor;
  const [tab,setTab] = useState('Información');
  const avatarInput = useRef(null), bannerInput = useRef(null), tabButtons = useRef([]);
  const catalog = useData('/profile/location-catalog');
  const availability = useUsernameAvailability(info.username,true,{currentUsername:saved?.username || user.username,profile:true});
  const name = [info.name,info.lastName].filter(Boolean).join(' ') || (saved?.publicName && !saved.publicName.startsWith('@') ? saved.publicName : 'Tu nombre');
  const image = avatar.preview || (saved?.avatarFileId ? fileUrl(saved.avatarFileId) : '');
  const bannerImage = banner.preview || (saved?.bannerFileId ? fileUrl(saved.bannerFileId) : '/images/teamsHero.png');
  const country = catalog.data?.countries.find(row=>row.code===contact.countryCode)?.name;
  const location = [contact.district,contact.department,country].filter(Boolean).join(', ');
  const changeInfo = event => setInfo(current=>({...current,[event.target.name]:event.target.value}));
  const changeContact = event => setContact(current=>({...current,[event.target.name]:event.target.value}));
  const regions = [...new Set(catalog.data?.ubigeos.map(row=>row.department) || [])];
  const provinces = [...new Set(catalog.data?.ubigeos.filter(row=>row.department===contact.department).map(row=>row.province) || [])];
  const districts = catalog.data?.ubigeos.filter(row=>row.department===contact.department && row.province===contact.province) || [];
  function selectLocation(event) {
    const {name,value} = event.target;
    setContact(current=>{
      if (name==='countryCode') return {...current,countryCode:value,department:'',province:'',district:'',ubigeoCode:''};
      if (name==='department') return {...current,department:value,province:'',district:'',ubigeoCode:''};
      if (name==='province') return {...current,province:value,district:'',ubigeoCode:''};
      const row = districts.find(row=>row.code===value);
      return {...current,ubigeoCode:value,district:row?.district || ''};
    });
  }
  function tabKey(event,index) {
    let next;
    if (event.key==='ArrowRight') next=(index+1)%tabs.length;
    if (event.key==='ArrowLeft') next=(index+tabs.length-1)%tabs.length;
    if (event.key==='Home') next=0;
    if (event.key==='End') next=tabs.length-1;
    if (next===undefined) return;
    event.preventDefault();setTab(tabs[next]);tabButtons.current[next]?.focus();
  }
  const uploadInput = (ref,selection,label) => <input ref={ref} className="profile-file-input"
    type="file" accept="image/png,image/jpeg,image/webp" aria-label={label} tabIndex={-1}
    disabled={busy} onChange={selection.select}/>;
  return <>
    <header className="profile-hero" style={{backgroundImage:`linear-gradient(90deg,#06131ff5 0%,#06131fa0 36%,#06131f05 78%),url("${bannerImage}")`}}>
      <div><p>CUENTA</p><h1>Perfil</h1><span>Construye tu identidad deportiva<br/> en Invictus.</span></div>
      <div className="profile-banner-controls">
        <button type="button" className="profile-banner-button" disabled={busy} onClick={()=>bannerInput.current.click()}><OutlineIcon name="camera"/>Cambiar banner</button>
        {uploadInput(bannerInput,banner,'Imagen del banner')}
        <small>JPG, PNG o WebP · hasta 10 MB · acceso público</small>
        {banner.file && <div className="profile-banner-actions">
          <button disabled={busy || !!banner.error} onClick={editor.saveBanner}>{editor.bannerAction.busy?'Guardando…':'Guardar banner'}</button>
          <button disabled={busy} onClick={banner.clear}>Descartar</button>
        </div>}
        {banner.error && <p className="error" role="alert">{banner.error}</p>}
        <Feedback state={editor.bannerAction}/>
      </div>
    </header>
    <div className="profile-content"><div className="profile-editor">
      <aside className="profile-identity">
        <h2>Tu identidad</h2>
        <div className="profile-avatar-wrap"><div className="profile-avatar">{image ? <img src={image} alt="Foto de perfil"/> : <span aria-hidden="true">{(name==='Tu nombre'?info.username:name).slice(0,1).toUpperCase()}</span>}</div>
          <button type="button" className="profile-camera" aria-label="Cambiar avatar" title="Cambiar imagen del perfil" disabled={busy}
            onClick={()=>{setTab('Información');avatarInput.current.click();}}><OutlineIcon name="camera"/></button>
          {uploadInput(avatarInput,avatar,'Imagen del avatar')}
        </div>
        <h3>{name}</h3><p className="profile-handle">@{info.username.trim().toLowerCase()}</p>
        {(contact.district || contact.department || saved?.location) && <p className="profile-location"><OutlineIcon name="location"/>{contact.district || contact.department ? location : saved.location}</p>}
        {info.bio && <p className="profile-bio">{info.bio}</p>}
        <div className="profile-photo-help"><OutlineIcon name="info"/><small>Esta tarjeta muestra una vista previa de tu identidad deportiva.</small></div>
      </aside>
      <div className="profile-main">
        <div className="profile-tabs" role="tablist" aria-label="Secciones del perfil">{tabs.map((label,index)=>
          <button key={label} type="button" role="tab" id={'profile-tab-'+index}
            aria-selected={tab===label} aria-controls={'profile-panel-'+index} tabIndex={tab===label?0:-1}
            ref={element=>tabButtons.current[index]=element} onKeyDown={event=>tabKey(event,index)} onClick={()=>setTab(label)}>{label}</button>
        )}</div>
        {tabs.map((label,index)=><section key={label} role="tabpanel" id={'profile-panel-'+index}
          aria-labelledby={'profile-tab-'+index} hidden={tab!==label} className="profile-personal" tabIndex={0}>
          {label==='Información' && <form onSubmit={event=>{event.preventDefault();if(!busy && !avatar.error && availability.status==='available')editor.saveInformation();}}>
            <h2>Información personal</h2><p className="profile-intro">Presenta quién eres. Tu fecha de nacimiento y documento son privados.</p>
            <fieldset disabled={busy}><legend className="profile-sr-only">Información personal</legend>
              <div className="profile-grid">
                <ProfileField label="Nombres" name="name" value={info.name} onChange={changeInfo} maxLength={80} autoComplete="given-name"/>
                <ProfileField label="Apellidos" name="lastName" value={info.lastName} onChange={changeInfo} maxLength={120} autoComplete="family-name"/>
              </div>
              <ProfileField label="Nombre de usuario" name="username" value={info.username} onChange={changeInfo}
                required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._]{3,30}" autoComplete="username"
                aria-describedby="profile-username-help" aria-invalid={['taken','invalid'].includes(availability.status)}/>
              <div id="profile-username-help" className="profile-username-feedback" role="status">
                {availability.status==='available' && `✓ @${availability.username} está disponible`}
                {availability.status==='checking' && 'Comprobando disponibilidad…'}
                {availability.status==='taken' && 'Este nombre de usuario ya está en uso.'}
                {['empty','invalid'].includes(availability.status) && 'Usa 3–30 caracteres: letras a–z, números, punto o guion bajo.'}
                {availability.status==='error' && <>No pudimos comprobar la disponibilidad. <button type="button" onClick={availability.retry}>Volver a comprobar</button></>}
              </div>
              <div className="profile-grid">
                <ProfileField label="Fecha de nacimiento" name="dateOfBirth" type="date" value={info.dateOfBirth} onChange={changeInfo} max={new Date().toISOString().slice(0,10)} autoComplete="bday"/>
                <ProfileField label="Género" name="gender" value={info.gender} onChange={changeInfo}>
                  <option value="">Sin indicar</option><option value="MALE">Masculino</option><option value="FEMALE">Femenino</option>
                  <option value="NON_BINARY">No binario</option><option value="SELF_DESCRIBED">Otra identidad</option><option value="PREFER_NOT_TO_SAY">Prefiero no indicarlo</option>
                </ProfileField>
                <ProfileField label="Tipo de documento" name="documentType" value={info.documentType} onChange={changeInfo}>
                  <option value="">Sin indicar</option><option value="DNI">DNI</option><option value="FOREIGN_RESIDENT_CARD">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option>
                </ProfileField>
                <ProfileField label="Número de documento" name="documentNumber" value={info.documentNumber} onChange={changeInfo}
                  maxLength={info.documentType==='DNI'?8:30} pattern={info.documentType==='DNI'?'[0-9]{8}':undefined} inputMode={info.documentType==='DNI'?'numeric':'text'}/>
              </div>
              <div className="profile-avatar-actions">
                {avatar.file && <button type="button" disabled={busy} onClick={avatar.clear}>Descartar nueva foto</button>}
                <small>JPG, PNG o WebP · hasta 10 MB · acceso público. Se guarda con Información.</small>
              </div>
              {avatar.error && <p className="error" role="alert">{avatar.error}</p>}
              <label htmlFor="profile-bio">Sobre mí</label><div className="profile-input profile-textarea">
                <textarea id="profile-bio" name="bio" value={info.bio} onChange={changeInfo} maxLength={2000} rows={4} aria-describedby="profile-bio-count"/>
              </div><small id="profile-bio-count" className="profile-counter">{info.bio.length}/2000</small>
              <div className="profile-actions"><button className="profile-save" disabled={!!avatar.error || availability.status!=='available'}>
                <OutlineIcon name="save"/>{editor.informationAction.busy?'Guardando…':'Guardar información'}</button></div>
            </fieldset><Feedback state={editor.informationAction}/>
          </form>}
          {label==='Contacto' && <form onSubmit={event=>{event.preventDefault();if(!busy)editor.saveContact();}}>
            <h2>Contacto y ubicación</h2><p className="profile-intro">Tu teléfono y ubicación detallada son privados. No necesitas completar todo el perfil para usar Invictus.</p>
            <fieldset disabled={busy}><legend className="profile-sr-only">Contacto</legend>
              <div className="profile-field"><label htmlFor="profile-account-email">Correo electrónico</label>
                <div className="profile-input"><input id="profile-account-email" type="email" value={user.email || ''} readOnly
                  autoComplete="email" aria-describedby="profile-account-email-help"/></div>
              </div>
              <small id="profile-account-email-help" className="profile-field-help">Correo de tu cuenta. Por ahora no se puede modificar.</small>
              <ProfileField label="WhatsApp / teléfono" name="phone" type="tel" value={contact.phone} onChange={event=>setContact(current=>({...current,phone:event.target.value.replace(/[\s()-]/g,'')}))}
                placeholder="+51 980 784 509" autoComplete="tel" maxLength={25} pattern="\+[1-9][0-9]{6,14}" aria-describedby="profile-phone-help"/>
              <small id="profile-phone-help" className="profile-field-help">Incluye el código de país, por ejemplo +51 para Perú.</small>
              <State resource={catalog}>{data=><>
                <ProfileField label="País" name="countryCode" value={contact.countryCode} onChange={selectLocation}>
                  <option value="">Sin indicar</option>{data.countries.map(row=><option key={row.code} value={row.code}>{row.name}</option>)}
                </ProfileField>
                {contact.countryCode==='PE' ? <div className="profile-grid">
                  <ProfileField label="Departamento" name="department" value={contact.department} onChange={selectLocation}><option value="">Sin indicar</option>{regions.map(name=><option key={name}>{name}</option>)}</ProfileField>
                  <ProfileField label="Provincia" name="province" value={contact.province} onChange={selectLocation} disabled={!contact.department}><option value="">Sin indicar</option>{provinces.map(name=><option key={name}>{name}</option>)}</ProfileField>
                  <ProfileField label="Distrito" name="ubigeoCode" value={contact.ubigeoCode} onChange={selectLocation} disabled={!contact.province}><option value="">Sin indicar</option>{districts.map(row=><option key={row.code} value={row.code}>{row.district}</option>)}</ProfileField>
                </div> : contact.countryCode && <div className="profile-grid">
                  <ProfileField label="Región / departamento" name="department" value={contact.department} onChange={changeContact} maxLength={120}/>
                  <ProfileField label="Provincia / ciudad" name="province" value={contact.province} onChange={changeContact} maxLength={120}/>
                  <ProfileField label="Distrito / localidad" name="district" value={contact.district} onChange={changeContact} maxLength={120}/>
                </div>}
              </>}</State>
              {saved?.location && <p className="profile-legacy-location">Ciudad registrada anteriormente: {saved.location}. Se conserva mientras completas tu ubicación.</p>}
              <div className="profile-actions"><button className="profile-save" disabled={catalog.loading || !!catalog.error}><OutlineIcon name="save"/>{editor.contactAction.busy?'Guardando…':'Guardar contacto'}</button></div>
            </fieldset><Feedback state={editor.contactAction}/>
          </form>}
          {emptyCopy[label] && <div className="profile-coming-soon"><OutlineIcon name="info"/><h2>{label}</h2><p>{emptyCopy[label]}</p><span>Próximamente</span></div>}
        </section>)}
      </div>
    </div></div>
  </>;
}
