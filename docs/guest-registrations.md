# Inscripción sin cuenta — etapa 5

Implementada localmente el 2026-10-03. Producción pendiente.

## Flujo

Un visitante abre un evento gestionado publicado y futuro, elige categoría (si existe), ingresa nombres, apellidos y teléfono, consulta Yape/Plin y adjunta comprobante privado cuando corresponde. No se crean User ni ParticipantProfile. Inscripción pagada o gratuita queda PENDING_REVIEW. El organizador usa la consola existente para confirmar, observar o rechazar. Un evento gratuito sin categorías también admite revisión.

La respuesta lleva a una constancia con enlace privado en /inscripcion/:token (desde el ajuste de navegación del 2026-10-03; los enlaces #/ anteriores siguen funcionando). Permite consultar estado desde otro navegador, ver comprobantes y corregir una inscripción observada. No requiere correo, DNI ni cuenta. Los campos de edad/género aparecen solo si una categoría histórica los exige. El enlace es una credencial: debe conservarse y compartirse únicamente con quien deba consultar la inscripción. No se implementaron avisos automáticos ni recuperación por teléfono.

## Reutilización y cambios

- EventRegistration reutiliza categorySnapshot/participantSnapshot, estados, cupos y revisión; userId opcional y guestAccessHash único. Profile sigue reservado a cuentas reales.
- StoredFile reutiliza el almacenamiento local/S3, validación de contenido, tamaño máximo 10 MB y privacidad; ownerId opcional y guestAccessHash para archivos de invitados. Exactamente una identidad por archivo; archivos invitados siempre privados.
- PaymentOperation conserva precio, destinatario e instrucciones congeladas; payerId puede ser nulo únicamente para operaciones de inscripción. ManualPayment y PaymentResult se reutilizan sin nuevas tablas.
- RegistrationAudit.actorId opcional identifica una acción de invitado; las revisiones siguen registrando el usuario real del organizador.
- Migración 031 aplicada solo a localhost/invictus y localhost/invictus_test. No borra registros ni cambia identidades existentes; relaciones y unicidad eventId/userId históricas se conservan.
- El flujo inicial de invitados comparte prepareRegistration, openPaymentOperation, servicio de pagos y coordinador de resultados. La creación se ejecuta dentro del mismo lock/transacción conservadora que las inscripciones autenticadas.
- Se mantiene la API autenticada histórica; rutas separadas de invitados no conceden acceso a endpoints de organizador, perfiles ni archivos generales.

## Acceso e idempotencia

Token con 256 bits aleatorios y firma HMAC con separación de dominio usando FILE_SIGNING_KEY. Solo su SHA-256 se guarda en base de datos. La clave debe mantenerse estable; cambiarla invalida los enlaces anteriores. Cada token pertenece a un evento/inscripción; no acepta precio, estado, propietario ni destinatario enviados por el navegador. Consulta devuelve únicamente los datos necesarios de esa inscripción.

Reenvío del mismo token/categoría/método devuelve la inscripción existente sin duplicar cupos ni pagos. Cambiar categoría/método con el mismo token devuelve conflicto. La UI conserva el token en sessionStorage y recupera la constancia al reenviar. La identidad del invitado no está verificada: tokens nuevos representan solicitudes independientes. No se impone unicidad del teléfono, que puede compartirse en una familia; no se promete impedir duplicados de una persona entre navegadores.

Comprobantes solo accesibles mediante token correspondiente o permiso de gestión del evento. No son archivos públicos. Las cargas verifican la firma, estado/evento, límites por IP y hasta 10 archivos por token. La consulta sigue disponible al despublicar; una inscripción observada puede cargar corrección mientras el evento no esté cerrado. Se conserva el cupo durante observación y se libera al rechazar.

## Verificación mínima

- tests/guest-registrations.test.js: 2/2 casos integrales aprobados (pagada y gratuita general), incluyendo privacidad, archivo ajeno, idempotencia, cupo, observación/corrección/confirmación y ausencia de cuentas ficticias.
- Seis regresiones relacionadas de categorías/configuración/Teams/eventos personales/informativos aprobadas. Sin ejecutar módulos ajenos al cambio.
- scripts/check-guest-registration-ui.js: único recorrido de producto a 390/1440 px aprobado; envío anónimo con Plin/comprobante, consulta desde otro contexto y revisión desde consola. Capturas guest-*.png inspeccionadas en .local/screenshots. Se ajustaron dos selectores del script a las etiquetas y texto reales; no se amplió la matriz.
- Compilación web/admin y comprobación de formato.

## Pendientes del MVP

Home compacto con eventos, navegación y módulos fuera de alcance ocultos, revisión final de identidad Profile/User y despliegue. Las capacidades existentes de Teams/perfil ampliado/tienda se conservan.

## Consulta por código — 2026-10-12

Cada inscripción tiene un código aleatorio global `INV-XXXX-XXXX-XXXX-XXXX`, distinto del código de participación/check-in. La base de datos lo asigna también a registros existentes y exige unicidad. La constancia de invitado muestra el código y permite copiarlo o guardar el enlace privado, con el tema Invictus y layout compacto móvil.

El home consulta `POST /api/registration-status` con `{code}`; acepta minúsculas, espacios y guiones. Devuelve exclusivamente código, evento, clasificación y estado, sin identidad, teléfono, notas de revisión ni archivos. Límite de 15 consultas por minuto/IP y respuesta sin caché. Datos personales, observaciones, comprobantes y correcciones siguen requiriendo el enlace privado. No hay recuperación de enlaces mediante código.

Verificación mínima: dos pruebas de invitados, incluyendo formato, persistencia, consulta normalizada, código inexistente, unicidad en base de datos y privacidad; build web; script `check-registration-lookup-ui.mjs` a 390/1440 px con API simulada para copia, pago desplegable, error y resultado. Capturas inspeccionadas visualmente.

## Número de competidor y constancia desde el home — 2026-10-12

`competitorNumber` es un entero opcional separado del código de consulta. Se asigna automáticamente al pasar a CONFIRMED, desde 1 por evento; la UI lo presenta con al menos cuatro cifras (`0001`). Un contador persistente y un trigger de PostgreSQL serializan aceptaciones, con unicidad evento/número. El número no se cambia ni reutiliza tras cancelaciones. La migración numera también las inscripciones ya aceptadas/finalizadas, por primera aceptación registrada (o creación si no hay auditoría).

Se muestra en constancia privada, consulta del home, constancia pública limitada, detalle y listados de participantes/cuenta. El organizador puede buscar `0027`. El home ofrece “Ver constancia” como acción principal y “Ver evento” como secundaria; `/constancia/:code` usa únicamente la respuesta limitada del buscador, sin revelar identidad, comprobantes ni acceso de corrección.

Verificación: dos pruebas de invitados ampliadas para pendientes sin número, aceptaciones concurrentes, correlativo por evento, búsqueda y conservación tras cancelar; build web; UI simulada a 390/1440 px incluyendo navegación home/constancia y número `0027`. Captura móvil inspeccionada.

## Contacto por WhatsApp — 2026-10-12

Las constancias pública limitada y privada muestran “Contactar al organizador” con icono cuando el evento tiene `publicOrganizerPhone` válido. El organizador configura o elimina este contacto público opcional en Información del evento. Se aceptan celulares peruanos de nueve cifras (se agrega +51) y números internacionales con prefijo +. No se usan teléfonos privados de perfiles ni datos de pago como contacto. El enlace abre WhatsApp con un texto preparado que incluye evento y código de inscripción, sin enviar mensajes automáticamente ni incluir el token privado.

Verificación mínima: build web, dos pruebas de invitados (persistencia, permisos, validación y contacto ausente), revisión móvil/escritorio con API simulada y comprobación del destino/texto del enlace.
