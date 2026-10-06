# Profile como fuente de identidad — cierre local 2026-10-03

## Resultado

ParticipantProfile es la fuente de nombres/apellidos para cuentas con perfil. Guardarlos ya no actualiza User.name/lastName. User conserva autenticación, username, email, rol y estado. Los campos históricos de nombres permanecen intactos para compatibilidad, sin migraciones ni eliminación de datos.

Para cuentas antiguas sin Profile se conserva el respaldo de nombres de User. Su primer guardado puede recuperarlos en el Profile existente de la arquitectura; no se crea otro tipo de perfil. Una vez existe Profile, incluso nombres vacíos/anulados son definitivos: no se rellenan desde valores históricos de User al cambiar username.

## Lecturas adaptadas

server/profile/identity.js contiene selección y proyección de nombres; solo consulta esos dos campos del perfil. No incorpora teléfono, DNI ni otros datos privados a la sesión, miembros o auditorías. El servicio reutilizable de autenticación queda intacto; una adaptación de la aplicación aplica los nombres a registro/login/autenticación manteniendo la forma de respuesta.

Se adaptan la sesión, nuevas inscripciones autenticadas, datos de usuario/auditoría en consola, búsqueda, administración de usuarios, miembros/solicitudes de Teams y reporte histórico de asignación de eventos. El fallback a User para búsqueda de nombres se aplica únicamente a cuentas sin Profile; username/email y snapshots históricos siguen consultables.

Las nuevas inscripciones toman los nombres del Profile dentro de su transacción. Inscripciones existentes conservan participantSnapshot; editar el perfil no reescribe sus nombres, datos económicos, comprobantes ni estados. Las identidades de cuenta mostradas al lado y las auditorías pueden reflejar los nombres actuales sin alterar el snapshot de participación. Invitados siguen utilizando sus datos propios, sin cuentas/perfiles ficticios.

Los controles de acceso, roles, membresías, contraseña, cookies y sesiones por UUID no cambian. No se elimina ninguna columna ni tabla. No se amplían Teams ni perfiles deportivos.

## Verificación mínima

Una sola prueba integral: node --env-file=.env --test tests/profile-identity.test.js. Aprobada contra invictus_test local. Comprueba guardado exclusivo en Profile, respaldo antiguo sin perfil, vaciado sin resurrección, sesión/login/logout, snapshot nuevo y preservación del anterior, datos de consola, búsqueda por Profile y respuestas de identidad ya existentes. Se incluyen únicamente dos respuestas de miembros para comprobar el consumidor histórico afectado, sin volver a probar los flujos de Teams.

La misma prueba se repitió tras ajustar la búsqueda; no se ampliaron suites, recorridos visuales ni compilación de frontend. La aserción antigua de almacenamiento en tests/athlete-profile.test.js se actualizó al comportamiento actual. Reporte de migración de Teams comprobado sintácticamente; no se ejecuta ninguna asignación ni migración.

## Continuación

Flujos principales del MVP implementados y verificados por incrementos en local. Despliegue pendiente; ver mvp-release.md. La futura eliminación de columnas antiguas de User queda fuera de este alcance.
