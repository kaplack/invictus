# Invictus MVP — cierre local y preparación de despliegue

Estado 2026-10-03: implementación local de los flujos principales completa por incrementos. No se ha desplegado esta versión ni verificado el estado actual de producción.

## Versión para revisar

- Organizador: registro existente, perfil básico, eventos personales sin Team, publicación/despublicación, categorías Yape/Plin y revisión de comprobantes.
- Participante invitado: descubrir eventos, elegir categoría si corresponde, nombres/apellidos/teléfono, pago manual/comprobante privado, estado pendiente y enlace privado para consultar/corregir.
- ADMIN: informativos con organizador real/enlace externo, creación/edición/publicación/despublicación con herramientas existentes.
- Home corto, cards/búsqueda y navegación centrada en Eventos/Inscripciones. Teams/comercio conservados y ocultos mediante opciones visibles.
- Profile fuente de información personal, sin nuevas escrituras duplicadas a User ni alteración de snapshots históricos.

Evidencia ya registrada en los documentos de cada incremento: pruebas integrales dirigidas y recorridos 1440/390 px; Home además 320x568 para comprobar hero <=35%. Último ajuste de identidad: una prueba integral aprobada. No repetir toda la batería si no cambian los flujos verificados.

## Secuencia de despliegue pendiente

1. Identificar la revisión concreta de código y confirmar los destinos existentes de API/web/admin/base de datos. Revisar el estado real del historial de migraciones en producción antes de determinar cuáles faltan; el despliegue anterior fue reportado por el usuario y no constituye evidencia del schema actual.
2. Respaldar la base y aplicar únicamente las migraciones versionadas pendientes usando el procedimiento existente scripts/migrate.js y CONFIRM_DATABASE igual al destino real. Hay cambios locales hasta 031; no asumir que solo faltan 028–031 ni utilizar db push. Generar el cliente Prisma con el schema de esta revisión.
3. Desplegar API después del schema, seguida de web y admin. Conservar la configuración existente de API URLs, origins, cookies, S3 y FILE_SIGNING_KEY. Esta clave firma también los enlaces privados de invitados: mantenerla estable. Sin nuevos servicios ni pasarela de pago.
4. Comprobación mínima posterior: salud API, Home, ficha pública e ingreso con cuenta designada. Un envío/revisión real solo se comprueba con un evento de prueba acordado; no poblar producción con los fixtures usados en invictus_test.

No se ejecutó ningún paso en producción. Las credenciales y valores de conexión no se escriben en documentación. El despliegue se realiza como siguiente acción concreta, con la revisión y destino identificados.

## Compatibilidad y límites vigentes

La inscripción autenticada histórica se conserva. Su flujo general gratuito puede confirmar automáticamente y las categorías antiguas pueden exigir elegibilidad. Los invitados siguen el flujo mínimo y revisión manual del MVP. No se implementaron notificaciones automáticas ni recuperación de enlaces privados por teléfono; la consulta de estado usa el enlace guardado por el participante.

Idempotencia de invitados por token de inscripción, sin verificación de identidad ni unicidad de teléfono. Home busca sobre los próximos 100 eventos devueltos por el endpoint existente. Estos límites están documentados y no se resuelven ampliando alcance en este cierre.

Las migraciones locales conservan tablas/datos. Un retorno a una API antigua requiere revisar su compatibilidad con las nuevas inscripciones invitadas y métodos personales; no deshacer el schema borrando esos registros. Preferir una corrección sobre esta revisión si ya recibió datos con el nuevo flujo.
