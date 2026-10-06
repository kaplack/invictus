# Presencia digital

Pestaña opcional integrada en /perfil. No modifica Información ni Contacto. Sin dependencias nuevas, OAuth, perfil público ni implementación de Deportes/Trayectoria.

## Datos y API
ParticipantProfile.websiteUrl es nullable, VARCHAR(2048). ParticipantSocialLink contiene id UUID, participantProfileId, platform SocialPlatform, url, createdAt y updatedAt. UNIQUE(profile, platform) y FK con borrado en cascada. Sin sortOrder: UI con orden fijo Instagram, TikTok, Facebook, YouTube, LinkedIn.
Migración: 20261002025_profile_digital_presence; aplicada solo a localhost/invictus e invictus_test. No actualiza datos previos. Regenerar Prisma al desplegar.

GET y PUT /api/profile incluyen websiteUrl y socialLinks [{ platform, url }], sin identificadores ni timestamps internos de los enlaces. Se conserva PUT: omitir socialLinks no cambia las redes; enviarlo sustituye el conjunto en una transacción. Valores vacíos eliminan enlaces, [] elimina todas las redes, websiteUrl vacío/null elimina el sitio web. Información, Contacto, avatar y banner conservan estos datos.

## Normalización
Sitio web: agrega https:// si falta el esquema, acepta HTTP/HTTPS, conserva rutas/query/fragmentos. URL serializada con URL de Node; ejemplo alanburga.com → https://alanburga.com/.
Instagram: username, @username o URL de perfil → https://instagram.com/usuario.
TikTok: username, @username o URL de perfil → https://tiktok.com/@usuario.
Facebook: perfil/página en facebook.com; conserva id numérico en /profile.php?id=….
YouTube: canales /@usuario, /channel/id, /c/nombre y /user/nombre. Rechaza videos y youtu.be.
LinkedIn: perfiles /in/… o páginas /company/….
Redes: hostname exacto admitido con/sin www, HTTPS, sin parámetros de seguimiento ni fragmentos. Rechaza dominios ajenos/engañosos, protocolos peligrosos, credenciales, puertos explícitos, caracteres de control y barras invertidas. No consulta destinos externos ni verifica propiedad o existencia de cuentas. La validación definitiva está en el backend.

## UI
Filas compactas, guardar explícito, mensaje de posible uso público, feedback actual y errores junto al campo cuando identificables. Campos móviles sin overflow. Tu identidad muestra solo iconos de enlaces guardados, con aria-label, title, foco visible, target=_blank y rel=noopener noreferrer. Sin URLs largas en la tarjeta.

## Verificación mínima
Dos tests agrupados en tests/digital-presence.test.js para CRUD, formatos, seguridad, aislamiento y UNIQUE. Regresiones existentes athlete-profile/auth-registration: 9 casos en total aprobados. Un recorrido scripts/check-digital-presence-ui.js comprueba errores por campo, guardado, eliminación, persistencia, iconos y responsive 1440/390 px; capturas inspeccionadas en .local/screenshots/digital-presence-*.png. npm run build:web aprobado.

## Pendientes
Aplicar migración y desplegar en producción. Al implementar perfil público, reutilizar un serializer explícito y respetar la visibilidad del perfil; este incremento no publica cuentas ni crea rutas públicas. Añadir plataformas al enum requerirá migración.
