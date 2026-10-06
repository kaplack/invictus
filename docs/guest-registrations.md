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
