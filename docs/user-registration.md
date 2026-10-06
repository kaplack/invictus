# Registro de cuentas

Registro mínimo: username, email y password. Username se normaliza con trim y minúsculas, admite a–z, 0–9, punto y guion bajo, entre 3 y 30 caracteres. Contraseña entre 8 y 128 caracteres; scrypt y sesiones permanecen iguales. Login exclusivamente por correo.

GET /api/auth/username-availability?username=… es anónimo, valida la entrada y devuelve { available }. Tiene límite independiente de frecuencia y no se cachea. El formulario espera 450 ms y descarta respuestas anteriores; errores de conexión permiten reintentar. PostgreSQL UNIQUE y CHECK son la autoridad final; conflictos de username/email devuelven 409 con USERNAME_IN_USE/EMAIL_IN_USE.

La migración 20261001023_user_username asigna user_<ordinal> a cuentas existentes, conserva sus datos y establece defaults vacíos para name/lastName. Aplicar antes del nuevo backend y regenerar Prisma. Aplicada únicamente en localhost/invictus y localhost/invictus_test; producción requiere despliegue de esta migración.

El registro no crea ParticipantProfile. Las pantallas usan nombres existentes o @username. La inscripción antigua conserva su creación de perfil privado, usando @username si falta el nombre. Snapshots nuevos incluyen username para mantener una identidad visible sin inventar nombres.

Perfil etapa 1 implementado: ParticipantProfile es la fuente de nombres/apellidos y User conserva valores históricos sin recibir nuevas copias; sesión y consumidores leen los nombres de Profile (ver profile-identity.md). Username se edita desde Información; no hay URLs públicas ni login por username. Los datos requeridos por evento siguen siendo una decisión propia de cada inscripción. Ver [perfil del deportista](athlete-profile.md).

Verificación: node --env-file=.env --test tests/auth-registration.test.js y regresiones de integración, Teams, ingresos, eventos y categorías (16 pruebas aprobadas). La migración se prueba con tabla vacía y cuentas existentes, y la aplicación local conservó los datos de las tres cuentas de desarrollo. UI: node --env-file=.env scripts/check-signup-ui.js; capturas en .local/screenshots/signup-desktop.png y signup-mobile.png.
