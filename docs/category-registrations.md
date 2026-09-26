# Inscripciones por categoría — etapa 4

Implementada localmente el 2026-09-26. Reutiliza el coordinador de inscripciones y PaymentOperation, ManualPayment y PaymentResult.

## Uso y reglas

1. El participante elige una sola categoría del evento, indica sus datos y selecciona un método habilitado de la misma moneda. El servidor calcula el importe y valida edad/género. La edad corresponde al día del evento, en su zona horaria, según la decisión del usuario.
2. Adjunta comprobante privado para Yape, Plin o transferencia. Efectivo admite comprobante opcional. Una categoría gratuita no usa método ni comprobante.
3. El envío reserva cupo del evento y de la categoría, y queda pendiente de revisión del Team. Se adoptó y comunicó como supuesto que las categorías gratuitas también requieren revisión. Los eventos anteriores sin categorías conservan confirmación automática.
4. En Mis eventos → Ver inscritos, OWNER/ADMIN busca participantes, filtra por categoría/estado, consulta cupos y comprobantes y acepta, observa o rechaza.
5. Observar exige motivo y conserva el cupo. El participante corrige sus datos y vuelve a cargar el comprobante desde Mis inscripciones. Se conservan ambos intentos. Categoría, método e importe quedan fijos.
6. Aceptar confirma inscripción y pago en la misma transacción. Rechazar libera el cupo y cierra la operación. No se permite reactivar la inscripción ni cambiar a otra categoría del mismo evento: se conserva la unicidad (eventId,userId).

## Estados e historial

| Vista | Inscripción | Pago |
|---|---|---|
| Pendiente de revisión del Team | PENDING_REVIEW | pending / pending_review |
| Observada | OBSERVED | observed |
| Aceptada | CONFIRMED | verified |
| Rechazada | REJECTED | rejected |

Categorías gratuitas no crean operación de pago. PENDING permanece como estado interno de creación y por compatibilidad histórica. CANCELLED y COMPLETED anteriores se conservan. Pendientes, observadas, confirmadas y completadas ocupan cupo; rechazadas/canceladas no. No hay caducidad, devoluciones, pagos parciales ni reinscripción.

EventRegistration conserva precio/moneda y snapshots de categoría y participante; PaymentOperation conserva instrucciones, importe y QR originales. Cambiar cuentas del Team no altera operaciones anteriores. RegistrationAudit registra actor, fecha, transición, motivo y datos enviados; ManualPayment/PaymentResult conservan intentos y revisiones. Una versión impide revisar o corregir desde una pantalla desactualizada. La creación repetida es idempotente sin cambiar categoría/método.

## Privacidad

El participante accede a su inscripción. OWNER/ADMIN del Team consulta y revisa; MEMBER, externos y ADMIN global sin membresía no obtienen acceso implícito. Moderación del evento y revisión de inscripciones permanecen separadas.

Los comprobantes son StoredFile privados y usan el servicio existente local/S3. Un proxy autenticado revalida permisos por petición, sin URL pública permanente. Revocar una membresía quita acceso; archivos referenciados no pueden eliminarse. S3 no fue verificado contra producción.

Los métodos/QR activos habilitados para un evento publicado se muestran a participantes autenticados para pagar. Después de inscribirse se consulta el snapshot original.

## API y organización

- GET /api/events/:id/registration-options: categorías, métodos e inscripción existente del usuario.
- POST /api/events/:id/register: categoryId, methodId, participant (birthDate, gender, phone), proofFileId. Los eventos sin categorías conservan cuerpo vacío y flujo anterior.
- GET /api/events/:id/registrations: búsqueda q, filtros categoryId/status, paginación offset, resumen y cupos.
- GET /api/registrations/:id: datos, intentos e historial.
- POST /api/registrations/:id/resubmit: version, participant, proofFileId.
- POST /api/registrations/:id/review: version, decision (CONFIRMED/OBSERVED/REJECTED), note.
- GET /api/registrations/:id/payments/:paymentId/proof y GET /api/registrations/:id/qr: archivos privados autorizados.

server/registrations concentra elegibilidad, hooks del coordinador, casos de uso y rutas. CategoryRegistration.jsx comparte inscripción/detalle/corrección/revisión; EventRegistrations.jsx presenta el listado del Team. Se reutilizan formularios, modales y tablas/cards.

## Migración y verificación

Migración 20260926019_category_registrations: campos opcionales y auditoría; amplía restricciones de estados/métodos y reemplaza el índice de intentos activos para permitir correcciones. No elimina filas ni tablas. Los registros anteriores mantienen estados y datos.

Migración 019 aplicada a invictus e invictus_test locales; cliente Prisma regenerado. Neon queda pendiente: ejecutar npx prisma migrate deploy con DATABASE_URL del destino correcto y regenerar Prisma en el despliegue. Producción no modificada.

Pruebas mínimas aprobadas: tests/category-registrations.test.js (1 caso integrado), tests/integration.test.js y tests/event-setup.test.js (3 regresiones). Cubren cupo concurrente, duplicados, edad/género, privacidad, snapshots, observación/reenvío/aceptación/rechazo, efectivo/transferencia, revisión concurrente y revocación. Build web/admin aprobado.

scripts/check-category-registration-ui.js aprobado: inscripción móvil, observación en escritorio, corrección y aceptación. Capturas category-enrollment-mobile.png, category-review-desktop.png y category-confirmed-mobile.png inspeccionadas, sin desbordamiento horizontal. No se amplió la batería tras la reiteración del usuario de pruebas mínimas.
