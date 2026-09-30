import React, { useId, useState } from 'react';
import { api } from '../services/api.js';
import { useAction } from '../hooks/data.js';
import { Field, Feedback } from '../components/UI.jsx';
import '../styles/auth.css';

export function Login({ onSession, redirect = '/cuenta', allowRegister = true }) {
  const [register, setRegister] = useState(false);
  return <section className="invictus-auth" aria-label={register ? 'Crear cuenta' : 'Iniciar sesión'}>
    <div className="auth-story">
      <div className="auth-story-content">
        <p className="auth-kicker">TU HISTORIA EMPIEZA AQUÍ</p>
        <h1>El próximo desafío<br/>empieza <em>contigo.</em></h1>
        <p>Encuentra tu Team, participa en eventos y comparte tu pasión por el deporte.</p>
        {allowRegister && <a className="auth-explore" href="#/teams">Conoce la comunidad <span aria-hidden="true">↗</span></a>}
      </div>
      <p className="auth-story-caption">CADA EVENTO TERMINA. EL ESFUERZO PERMANECE.</p>
    </div>
    <div className="auth-panel">
      <AuthForm key={register ? 'register' : 'login'} register={register} setRegister={setRegister}
        allowRegister={allowRegister} onSession={onSession} redirect={redirect}/>
    </div>
  </section>;
}

function AuthForm({ register, setRegister, allowRegister, onSession, redirect }) {
  const action = useAction(), passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  return <form className="auth-form" aria-busy={action.busy} onSubmit={event => {
    event.preventDefault();
    if (action.busy) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    action.run(async () => {
      const result = await api('/auth/' + (register ? 'register' : 'login'), 'POST', body);
      onSession(result.user);
      location.hash = redirect;
    }, 'Sesión iniciada.');
  }}>
    <p className="auth-kicker">{allowRegister ? 'COMUNIDAD INVICTUS' : 'GESTIÓN INVICTUS'}</p>
    <h2>{register ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
    <p className="auth-form-intro">{register ? 'Da el primer paso. Tu comunidad te espera.' : 'Ingresa para continuar tu historia.'}</p>
    <fieldset disabled={action.busy}>
      <legend className="auth-sr-only">{register ? 'Datos de registro' : 'Datos de acceso'}</legend>
      {register && <div className="auth-name-fields">
        <Field label="Nombre" name="name" required maxLength={80} autoComplete="given-name"/>
        <Field label="Apellidos" name="lastName" required maxLength={120} autoComplete="family-name"/>
      </div>}
      <Field label="Correo electrónico" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="tu@correo.com"/>
      <div className="auth-password-field">
        <label htmlFor={passwordId}>Contraseña</label>
        <div className="auth-password-control">
          <input id={passwordId} name="password" type={showPassword ? 'text' : 'password'} minLength={12} required
            autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? passwordId + '-help' : undefined}/>
          <button type="button" className="auth-password-toggle" aria-controls={passwordId} aria-pressed={showPassword}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(value => !value)}>
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {register && <small id={passwordId + '-help'}>Usa al menos 12 caracteres, mayúscula, minúscula, número y símbolo.</small>}
      </div>
      <button className="auth-submit" type="submit">{action.busy ? (register ? 'Creando cuenta…' : 'Ingresando…') : <>{register ? 'Crear cuenta' : 'Iniciar sesión'} <span aria-hidden="true">→</span></>}</button>
    </fieldset>
    <Feedback state={action}/>
    {allowRegister && <div className="auth-switch">
      <span>{register ? '¿Ya formas parte de Invictus?' : '¿Aún no tienes cuenta?'}</span>
      <button type="button" disabled={action.busy} onClick={() => setRegister(!register)}>{register ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</button>
    </div>}
  </form>;
}
