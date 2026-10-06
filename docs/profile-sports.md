# Deportes del perfil

## Alcance
Qué deportes practica el usuario y, opcionalmente, cuál es principal. Información, Contacto y Presencia digital se conservan. No se implementa Trayectoria ni niveles/experiencia/logros.

## Datos
ParticipantDiscipline une ParticipantProfile y el catálogo existente Discipline. Clave compuesta (participantProfileId, disciplineId), isPrimary boolean, FK al perfil con cascada y a Discipline con restricción. Sin campos adicionales ni catálogo paralelo.
La migración 20261002026_participant_disciplines crea la tabla y un índice único parcial sobre participant_profile_id WHERE is_primary=true. Garantiza como máximo un principal incluso fuera del backend; Prisma no representa ese índice parcial, que se conserva en el SQL versionado.

## API
Catálogo reutilizado: GET /api/disciplines; solo activos, mismo endpoint usado por Teams/Eventos.
GET /api/profile devuelve disciplines [{id,code,name,active,isPrimary}]. PUT /api/profile recibe disciplines [{disciplineId,isPrimary}]. Enviar el conjunto sustituye las asociaciones dentro de la transacción coordinada existente; omitirlo conserva los deportes. [] elimina todos. Máximo 20, sin duplicados y como máximo un principal. El perfil se obtiene del usuario autenticado, nunca del id enviado por cliente. Disciplinas desconocidas/inactivas nuevas se rechazan; las inactivas ya asociadas se conservan y pueden quitarse.

## Legacy
La revisión local encontró 2 perfiles de desarrollo y 45 de pruebas, sin listas legacy no vacías antes del cambio. Se conserva la columna JSON disciplines como archivo histórico de solo lectura; deja de actualizarse desde el adaptador de perfiles. La relación es la fuente del perfil autenticado y del serializer de la aplicación.
La migración convierte únicamente strings que coincidan, sin distinguir mayúsculas y con trim, con exactamente un nombre/código del catálogo. Deduplica coincidencias. No inventa un principal histórico, no modifica el JSON y no elimina valores ambiguos/desconocidos. En producción revisar ese archivo si existen valores sin correspondencia; no se consideran deportes activos hasta resolverlos explícitamente.

## Interacción
Edición local y botón Guardar deportes. El primer deporte agregado se marca principal en UI, pero se puede quitar la marca. Agregar un seleccionado es idempotente. Catálogo conserva seleccionados con sombreado sutil, ✓ y aria-pressed; quitar desde Tus deportes restablece +. Quitar el principal no elige otro. Búsqueda local por nombre sin distinguir mayúsculas. Tu identidad muestra el conjunto guardado con Principal textual. Icono genérico local, sin nuevas dependencias.

## Verificación mínima
node --env-file=.env --test tests/profile-sports.test.js tests/athlete-profile.test.js tests/digital-presence.test.js tests/event-setup.test.js: 7 casos aprobados (dos nuevos agrupados). Incluye constraints SQL, autorización, inactivos, conservación de perfil/imágenes/redes y migración legacy ambigua/deduplicada.
node --env-file=.env scripts/check-profile-sports-ui.js: búsqueda, primer principal, doble clic, cambio, guardado, eliminación y persistencia aprobados a 1440/390 px. Capturas inspeccionadas en .local/screenshots/profile-sports-desktop.png y profile-sports-mobile.png.
npm run build:web aprobado. Migración aplicada solo en localhost/invictus e invictus_test; Prisma generado. Producción no modificada.

## Pendientes
Desplegar migración/cliente/backend/frontend juntos. Conservar el índice parcial en futuras migraciones. Resolver manualmente valores legacy desconocidos/ambiguos si los hay en producción antes de retirar el archivo JSON. Trayectoria queda pendiente.

## Archivos
prisma/schema.prisma; migración 026; server/profile/sports.js, validation.js y service.js; vendor/perfil-trayectoria/src/prisma-store.js; client/src/components/ProfileSports.jsx y OutlineIcon.jsx; client/src/pages/Profile.jsx; client/src/styles/profile.css; tests/profile-sports.test.js; scripts/check-profile-sports-ui.js; BACKLOG.md.
