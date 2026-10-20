# Sesiones en iPhone y proxy de API

La web pública y el administrador usan `/api` en su propio origen. Las reglas en `vercel.json` y `admin/vercel.json` reenvían esas solicitudes a `https://api.invictus.com.pe/api`, antes de la regla de navegación a `index.html`.

En ambos proyectos de Vercel, establecer `VITE_API_URL=/api` para Production (y Preview si se utiliza). Una variable existente que apunte directamente a Render evita el proxy; cambiarla y volver a compilar/desplegar ambos proyectos. Conservar las demás variables.

La web pública debe estar alojada en Vercel para que estas reglas se apliquen. Si `invictus.com.pe` usa otro alojamiento, configurar allí el mismo proxy.

En Render, `WEB_ORIGINS` debe incluir los orígenes usados, entre ellos `https://invictus.com.pe` y `https://invictus-admin-kappa.vercel.app`, además de `https://www.invictus.com.pe` si se sirve ese origen. Conservar otros orígenes necesarios. Mantener HTTPS y cookies Secure/HttpOnly; no es necesario habilitar cookies de terceros en el iPhone.

Después del despliegue, comprobar en Safari: iniciar sesión con una cuenta existente, abrir Perfil e Inscripciones, recargar, cerrar sesión y confirmar que se vuelve a pedir acceso. En la pestaña de red, las solicitudes deben ir al dominio de la web bajo `/api`, sin redirección del navegador a Render. La respuesta de `/api/auth/session` sin sesión debe ser JSON con estado 401, nunca `index.html`.

La web y el administrador conservan sesiones independientes porque sus cookies pertenecen a dominios distintos.
