# Eventos por Team: transición compatible

## Comportamiento nuevo

La creación de eventos, tanto en Mis eventos como en Gestión de Invictus, requiere seleccionar un Team activo. El backend verifica OWNER/ADMIN. `User.role` no se modifica ni reemplaza esa membresía. `createdByUserId` conserva al creador real; `organizerId` continúa temporalmente por compatibilidad, pero no concede acceso cuando existe `teamId`.

Mis eventos muestra eventos de los Teams administrados por el usuario y los eventos antiguos propios todavía sin asignación. El Team aparece también en el panel global, catálogo/detalle público e historial de inscripciones. El formulario no permite transferir propiedad; Team distinto en una edición produce conflicto.

Los eventos externos conservan el ciclo borrador → revisión por Invictus → aprobación o correcciones. ADMIN global puede revisar el contenido, pero necesita membresía para administrar un evento del Team o consultar sus inscritos. Los eventos INVICTUS se publican desde Gestión y también requieren pertenecer al Team. OWNER/ADMIN puede editar sus borradores desde Mis eventos.

Las inscripciones gratuitas mantienen confirmación automática e incorporación al perfil. La aplicación configura ahora `autoConfirmFree` en el coordinador; ya no simula la identidad del organizador para confirmar. Categorías, pagos por Team y revisión manual de inscripción siguen fuera de esta entrega.

## Implementación

- `server/teams/event-access.js`: filtro de eventos accesibles y autorización por membresía vigente/Team activo. Escrituras bloquean Team y evento dentro de la transacción coordinada; la revocación usa el mismo bloqueo de Team.
- `server/personal-events.js`, `server/services.js`: creación con Team y creador, lectura, edición, inscritos y separación de moderación global.
- Los módulos locales en `vendor/gestion-eventos` y `vendor/inscripciones-eventos` reciben callbacks opcionales de autorización. Sus consumidores anteriores conservan la política predeterminada. El coordinador pasa su conexión transaccional al callback. No se modificó la biblioteca fuente BaseReutilizable.
- El servicio de eventos permite conservar imágenes ya vinculadas cuando otro administrador edita; una referencia nueva sigue exigiendo archivo público propio. El store mantiene la validación de archivos vivos.
- `components/EventForm.jsx` contiene el formulario compartido y `EventTeamField.jsx` lista Teams autorizados con paginación. Los endpoints antiguos conservan sus rutas; POST exige ahora teamId, PATCH no lo exige y prohíbe transferencias.

## Migración aditiva 017

Agrega `events.team_id`, `events.created_by_user_id`, claves foráneas restrictivas e índice por Team/estado. Ambas columnas permanecen opcionales para permitir históricos. No cambia slugs, publicaciones, tarifas, inscripciones ni datos de la tienda. El creador de cada evento nuevo se registra al crear; el de un histórico se rellena desde organizerId únicamente al aplicar su asignación revisada, como mejor evidencia disponible.

Primero generar el cliente Prisma y aplicar migraciones versionadas al destino confirmado. En Windows hay que detener la API local antes de `npm run db:generate` si mantiene bloqueada la DLL del motor. Reiniciar después. Producción requiere el despliegue habitual y no se modifica desde estas comprobaciones.

## Reporte, simulación y aplicación de históricos

1. `node --env-file=.env scripts/event-team-migration.js` genera `.local/event-team-report.json`: eventos sin Team, organizador, estado, inscritos y Teams candidatos. No escribe en la base. Los candidatos no se eligen automáticamente; separar los eventos oficiales de los externos y revisar organizadores suspendidos.
2. Crear un JSON de asignaciones explícitas:

   ```json
   [
     {
       "eventId": "UUID-del-evento",
       "expectedOrganizerId": "UUID-del-organizador-actual",
       "teamId": "UUID-del-Team-elegido"
     }
   ]
   ```

3. Simular: `node --env-file=.env scripts/event-team-migration.js --mapping .local/event-team-map.json`. Valida el mapa bajo transacción y devuelve `would_assign` sin escribir. Usar lotes pequeños, especialmente si hay muchas filas.
4. Tras revisar el mapa y disponer de respaldo recuperable, aplicar agregando `--apply`. Este modo exige `CONFIRM_DATABASE=host:puerto/base` correspondiente al destino. No ejecutarlo hasta definir las asignaciones reales.

El mapa exige evento y organizador esperados, Team activo y al menos un OWNER con cuenta activa. Rechaza entradas duplicadas y transferencias desde otro Team. Cada lote es atómico; un conflicto revierte sus cambios. Repetir el mismo mapa es idempotente. No crea Teams ni propietarios arbitrarios. Se conserva la identidad y el estado de cada evento/inscripción.

## Cierre pendiente de la transición

No imponer NOT NULL todavía. Tras revisar y aplicar todas las asignaciones, verificar que no quedan eventos sin Team ni Teams sin propietario operativo; añadir una migración posterior que haga teamId obligatorio y retirar las ramas de autorización histórica. No desplegar código anterior sobre datos ya migrados: volvería a otorgar permisos al creador. Preferir corrección hacia adelante; una restauración requiere coordinar datos y versión del código.

La migración inicial se verifica con una prueba que simula y aplica un mapa en invictus_test, comprueba rollback/idempotencia, conserva inscripción/slug/estado y revoca el acceso del creador no miembro. El despliegue y las asignaciones de producción requieren datos reales revisados; el reporte local no los sustituye.
