import React, { useEffect, useRef, useState } from 'react';
import { api, upload, fileUrl } from '../services/api.js';
import { useAction, useData } from '../hooks/data.js';
import { State, Feedback } from '../components/UI.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import '../styles/profile.css';

export function Account({ user }) {
  const resource = useData('/profile');
  return <section className="profile-page">
    <header className="profile-hero"><div><p>CUENTA</p><h1>Perfil</h1><span>Gestiona tu identidad y la información<br/> que compartes en Invictus.</span></div></header>
    <div className="profile-content"><State resource={resource}>{profile => <ProfileForm key={profile?.updatedAt || 'new'} profile={profile} user={user}/>}</State></div>
  </section>;
}

function ProfileForm({ profile, user }) {
  const action = useAction(), input = useRef(null);
  const [photo, setPhoto] = useState(null), [preview, setPreview] = useState('');
  const [saved, setSaved] = useState(profile), [photoError, setPhotoError] = useState('');
  const [values, setValues] = useState({publicName: profile?.publicName || user.name, location: profile?.location || '', bio: profile?.bio || ''});
  useEffect(() => {
    if (!photo) { setPreview(''); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const image = preview || (saved?.avatarFileId ? fileUrl(saved.avatarFileId) : '');
  const change = event => setValues(current => ({...current, [event.target.name]: event.target.value}));
  return <form className="profile-editor" aria-busy={action.busy} onSubmit={event => {
    event.preventDefault();
    if (action.busy || photoError) return;
    action.run(async () => {
      const avatarFileId = photo ? (await upload(photo, 'public')).id : saved?.avatarFileId || null;
      const result = await api('/profile', 'PUT', {...saved, ...values, avatarFileId, visibility: saved?.visibility || 'PRIVATE'});
      setSaved(result); setPhoto(null);
    }, 'Perfil guardado.');
  }}>
    <aside className="profile-identity">
      <h2>Tu identidad</h2>
      <div className="profile-avatar-wrap">
        <div className="profile-avatar">{image ? <img src={image} alt="Foto de perfil"/> : <span aria-hidden="true">{(values.publicName || user.name || 'U').slice(0,1).toUpperCase()}</span>}</div>
        <button type="button" className="profile-camera" aria-label="Cambiar foto de perfil" title="Cambiar foto de perfil" disabled={action.busy} onClick={() => input.current.click()}><OutlineIcon name="camera"/></button>
      </div>
      <input ref={input} className="profile-file-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Foto de perfil" tabIndex={-1} disabled={action.busy} aria-describedby="profile-photo-help" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
        if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { setPhotoError('Elige una imagen JPG, PNG o WebP.'); return; }
        if (!file.size || file.size > 10 * 1024 * 1024) { setPhotoError('Elige una imagen con contenido de hasta 10 MB.'); return; }
        setPhotoError(''); setPhoto(file);
      }}/>
      <h3>{values.publicName || 'Tu nombre'}</h3>
      {values.location && <p className="profile-location"><OutlineIcon name="location"/>{values.location}</p>}
      {values.bio && <p className="profile-bio">{values.bio}</p>}
      <div className="profile-photo-help" id="profile-photo-help"><OutlineIcon name="info"/><small>JPG, PNG o WebP · máximo 10 MB. La foto tendrá acceso público. La nueva foto se guardará con los cambios.</small></div>
      {(photo || photoError) && <button className="profile-discard" type="button" disabled={action.busy} onClick={() => { setPhoto(null); setPhotoError(''); }}>Descartar nueva foto</button>}
      {photoError && <p className="error" role="alert">{photoError}</p>}
    </aside>
    <div className="profile-personal">
      <h2>Información personal</h2>
      <p className="profile-intro">Actualiza cómo te presentas en Invictus.</p>
      <fieldset disabled={action.busy}>
        <legend className="profile-sr-only">Datos del perfil</legend>
        <label htmlFor="profile-name">Nombre del perfil</label>
        <div className="profile-input"><OutlineIcon name="user"/><input id="profile-name" name="publicName" value={values.publicName} onChange={change} required maxLength={120} autoComplete="nickname"/></div>
        <label htmlFor="profile-city">Ciudad <span>(opcional)</span></label>
        <div className="profile-input"><OutlineIcon name="location"/><input id="profile-city" name="location" value={values.location} onChange={change} maxLength={120} autoComplete="address-level2"/></div>
        <label htmlFor="profile-bio">Sobre ti <span>(opcional)</span></label>
        <div className="profile-input profile-textarea"><OutlineIcon name="note"/><textarea id="profile-bio" name="bio" value={values.bio} onChange={change} maxLength={2000} rows={4} aria-describedby="profile-bio-count"/></div>
        <small id="profile-bio-count" className="profile-counter">{values.bio.length}/2000</small>
        <div className="profile-actions"><button className="profile-save" disabled={!!photoError}><OutlineIcon name="save"/>{action.busy ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </fieldset>
      <Feedback state={action}/>
    </div>
  </form>;
}
