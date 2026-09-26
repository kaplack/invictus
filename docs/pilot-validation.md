# Etapa 5 — cierre mínimo del piloto
Fecha: 2026-09-26. Validación técnica local completada; no implica despliegue ni aprobación manual del usuario.

## Única ejecución adicional

`node --env-file=.env --test tests/pilot-validation.test.js`: **1/1 aprobado** sobre invictus_test local, con sesiones HTTP y PostgreSQL reales.

- Un usuario OWNER de un Team y MEMBER de otro no hereda permisos entre Teams; también se niega gestión al ADMIN global que solo es MEMBER.
- Dos categorías con cupo propio disponible compiten por un único cupo global: una creación tiene éxito y la otra recibe CAPACITY_REACHED.
- Rechazar libera el cupo para el participante que no pudo inscribirse; la inscripción rechazada no permite cambiar de categoría.
- Volver un evento oficial a borrador no permite cambiar precios de categorías ya utilizadas; el importe y snapshot permanecen intactos.

## Evidencia anterior reutilizada

| Punto | Evidencia vigente |
|---|---|
| Último OWNER concurrente | tests/teams.test.js aprobado en etapa 1; lógica de miembros sin cambios posteriores |
| Cuentas/métodos aislados por Team | tests/event-setup.test.js aprobado nuevamente en etapa 4 |
| Privacidad de comprobantes, acceso por ID y revocación | tests/category-registrations.test.js aprobado en etapa 4 |
| Cupo de categoría, duplicados y revisión concurrente | tests/category-registrations.test.js aprobado en etapa 4 |
| Instrucciones/QR originales, observación, reenvío y auditoría | tests/category-registrations.test.js aprobado en etapa 4 |
| Eventos anteriores, publicación/revisión, tienda, pedidos, pagos y perfiles | tests/integration.test.js aprobado en etapa 4; migraciones 018/019 aplicadas localmente sin eliminar filas |
| Interfaz participante y gestión del Team | scripts/check-category-registration-ui.js aprobado e imágenes inspeccionadas a 390/1440 px |
| Compilación web y administración | npm run build aprobado en etapa 4 |

No se repitieron esas pruebas ni la compilación: este cierre solo añade la prueba complementaria y documentación, sin cambios al código de aplicación. Las migraciones ya aplicadas tampoco se volvieron a ejecutar. Los permisos elevados se usaron porque la terminal/editor del sandbox no podían acceder normalmente al workspace.

## Pendientes de operación

- Prueba manual del usuario con sus datos y cuentas.
- Desplegar cambios y migraciones pendientes en Neon; verificar almacenamiento S3 en ese entorno. Producción no modificada por esta validación.
- Revisar/asignar los eventos históricos a Teams mediante el mapa explícito; no se asignaron automáticamente. La eliminación de la dependencia global ORGANIZER sigue como pendiente de transición en etapa 2.

La etapa 5 queda cerrada como validación técnica local mínima. No se afirma validación de producción, de S3 real, prueba de carga ni cobertura exhaustiva.
