# Teams: primer incremento

Implementado el 2026-09-25. Acceso desde menú de cuenta → Mis Teams (`#/mis-teams`). Permite crear, listar y editar Teams, ver miembros, agregar cuentas registradas por correo exacto, cambiar roles y quitar miembros. Los listados usan páginas de 20 filas y cards en móvil.

## Roles y alcance

User.role permanece global. TeamMember.role permite OWNER (información y miembros), ADMIN (información) y MEMBER (consulta). La creación asigna OWNER atómicamente. Ni OWNER ni ADMIN local obtienen acceso al panel global; ADMIN global tampoco obtiene acceso automático a Teams ajenos.

El servicio bloquea la fila del Team antes de modificar miembros y vuelve a comprobar permisos. La última membresía OWNER no puede eliminarse ni degradarse. Team inactivo es consultable por sus miembros, pero no editable. No hay borrado de Team, invitaciones ni endpoint para cambiar active en este incremento. Las eliminaciones directas por SQL quedan fuera del protocolo del servicio y no deben usarse para administrar membresías.

Los logos reutilizan StoredFile público; solo se asocia un logo nuevo del actor. Otro administrador puede conservar el logo actual. Los correos de usuarios no se exponen en el listado de miembros. Agregar por correo exacto tiene límite de frecuencia y no publica un directorio de cuentas.

Eventos, inscripciones y pagos conservan su comportamiento anterior: todavía no pertenecen a Teams. Su migración corresponde a la etapa 2 y siguientes.

## Código y API

- `server/teams/service.js`: validación, autorización, transacciones y DTOs. `routes.js`: adaptación HTTP; montado en `server/app.js` con sesión existente.
- GET/POST `/api/teams`: listar propios/crear. GET/PATCH `/api/teams/:id`: consultar/editar información.
- GET/POST `/api/teams/:id/members`: listar/agregar. PATCH/DELETE `/api/teams/:id/members/:memberId`: cambiar rol/quitar.
- GET de listados acepta `offset` y devuelve `{items,nextOffset}`. Sin sesión: 401; recurso ajeno: 404; miembro sin permiso: 403; duplicado/último owner: 409.
- `client/src/pages/Teams.jsx`: pantallas y formularios; `services/teams.js`: mutaciones mediante API existente; `styles/teams.css`: estilos propios del dominio. Las rutas viven en Application y el acceso en UserMenu. Reutiliza useData/useAction, Records, Modal, Field y Feedback.

## Migración y verificación

`prisma/migrations/20260925016_teams/migration.sql` solo agrega Team, TeamMember y TeamRole; no transforma eventos ni usuarios. Aplicada a las dos bases locales invictus e invictus_test. Producción pendiente del proceso normal de despliegue; generar cliente con `npm run db:generate` y aplicar migraciones con `npm run db:deploy` usando el destino explícitamente confirmado por `CONFIRM_DATABASE`.

Verificación mínima ejecutada:

- `npm run build`: web y admin aprobados.
- `node --env-file=.env --test tests/teams.test.js tests/integration.test.js`: 3/3 aprobadas con sesiones reales y PostgreSQL local, incluyendo último owner concurrente, roles, aislamiento, logos y regresión de tienda/eventos.
- Las primeras ejecuciones de Prisma/cargas fallaron con EPERM del sandbox de Windows; pasaron al ejecutarse con autorización fuera del sandbox.
- `node --env-file=.env scripts/check-teams-ui.js`: aprobado. Creación, agregado, cambio de rol, edición por ADMIN y restricción de MEMBER, error de último propietario, cierre con Escape y retorno de foco. Capturas inspeccionadas a 1440/390 px, sin overflow móvil. Solo usa invictus_test local, crea sus propias cuentas y cierra servidores/navegador al finalizar. Capturas en `.local/screenshots/teams-*.png`.

No se ejecutaron pruebas de carga ni una auditoría general. El script visual y las pruebas de integración conservan fixtures en la base local de prueba, como el resto de pruebas del proyecto.
