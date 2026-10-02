import React, { useId, useState } from 'react';
import { api } from '../services/api.js';
import { useAction } from '../hooks/data.js';
import { Field, Feedback } from '../components/UI.jsx';
import '../styles/auth.css';
import { useUsernameAvailability } from '../hooks/username.js';

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
  const [username, setUsername] = useState('');
  const availability = useUsernameAvailability(username, register);
  const usernameId = useId();
  const feedback = {
    empty: 'De 3 a 30 caracteres: letras a–z, números, punto o guion bajo.',
    invalid: 'Usa de 3 a 30 caracteres: letras a–z, números, punto o guion bajo.',
    checking: 'Comprobando disponibilidad…',
    available: '✓ @' + availability.username + ' está disponible',
    taken: 'Este nombre de usuario ya está en uso',
    error: 'No pudimos comprobar la disponibilidad. Vuelve a intentarlo.'
  };

  return <form className="auth-form" aria-busy={action.busy} onSubmit={event => {
    event.preventDefault();
    if (action.busy || (register && availability.status !== 'available')) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    action.run(async () => {
      const result = await api('/auth/' + (register ? 'register' : 'login'), 'POST', body);
      onSession(result.user);
      location.hash = redirect;
      return result;
    }, 'Sesión iniciada.').then(result => { if (register && !result) availability.retry(); });
  }}>
    <p className="auth-kicker">{allowRegister ? 'COMUNIDAD INVICTUS' : 'GESTIÓN INVICTUS'}</p>
    <h2>{register ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
    <p className="auth-form-intro">{register ? 'Da el primer paso. Tu comunidad te espera.' : 'Ingresa para continuar tu historia.'}</p>
    <fieldset disabled={action.busy}>
      <legend className="auth-sr-only">{register ? 'Datos de registro' : 'Datos de acceso'}</legend>
      {register && <div className="auth-username-field">
        <Field label="Nombre de usuario" id={usernameId} name="username" required minLength={3} maxLength={30}
          pattern="[a-z0-9._]{3,30}" autoComplete="username" autoCapitalize="none" spellCheck={false}
          value={username} onChange={e => setUsername(e.target.value.toLowerCase().trim())}
          aria-describedby={usernameId + '-help'} aria-invalid={['invalid', 'taken'].includes(availability.status)}/>
        <small id={usernameId + '-help'} role="status" aria-live="polite">{feedback[availability.status]}</small>
        {availability.status === 'error' && <button className="secondary" type="button" onClick={availability.retry}>Volver a comprobar</button>}
      </div>}
      <Field label="Correo electrónico" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="tu@correo.com"/>
      <div className="auth-password-field">
        <label htmlFor={passwordId}>Contraseña</label>
        <div className="auth-password-control">
          <input id={passwordId} name="password" type={showPassword ? 'text' : 'password'} minLength={register ? 8 : 1} maxLength={128} required
            autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? passwordId + '-help' : undefined}/>
          <button type="button" className="auth-password-toggle" aria-controls={passwordId} aria-pressed={showPassword}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(value => !value)}>
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {register && <small id={passwordId + '-help'}>Mínimo 8 caracteres.</small>}
      </div>
      <button className="auth-submit" type="submit" disabled={action.busy || (register && availability.status !== 'available')}>{action.busy ? (register ? 'Creando cuenta…' : 'Ingresando…') : <>{register ? 'Crear cuenta' : 'Iniciar sesión'} <span aria-hidden="true">→</span></>}</button>
    </fieldset>
    <Feedback state={action}/>
    {allowRegister && <div className="auth-switch">
      <span>{register ? '¿Ya formas parte de Invictus?' : '¿Aún no tienes cuenta?'}</span>
      <button type="button" disabled={action.busy} onClick={() => setRegister(!register)}>{register ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</button>
    </div>}
  </form>;
}
