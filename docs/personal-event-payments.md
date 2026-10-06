# Categorías y pagos personales

Un evento MANAGED sin Team configura categorías y Yape/Plin desde Mis eventos → Categorías y pagos. Se reutilizan EventCategory, TeamPaymentMethod, EventPaymentMethod, PaymentRecipient, EventRegistrationConfig, StoredFile y el circuito ManualPayment/PaymentOperation/PaymentResult. No se crea Team oculto ni tablas paralelas.

TeamPaymentMethod conserva su nombre y filas de Teams. Ahora pertenece exactamente a un Team o a un evento personal (eventId). Los métodos personales son Yape/Plin en soles, con teléfono peruano, titular, instrucciones y QR privado opcional. Al crearlos se habilitan en el evento. Las categorías personales nuevas usan PEN; campos de elegibilidad existen y se conservan, pero quedan fuera del formulario personal simplificado.

POST /api/events/:id/payment-methods crea método personal; PUT /api/events/:id/payment-methods/:methodId lo edita. PUT /api/events/:id/payment-methods conserva la selección existente. Categorías utilizan los endpoints anteriores. Todos requieren sesión y permiso de gestión del evento; se permiten cambios solo en borrador editable sin inscripciones. Métodos ajenos son rechazados por servicio y restricción SQL; selección de Team mantiene controles históricos.

El receptor personal se almacena en EventRegistrationConfig.paymentRecipientId. El precio lo determina la categoría; monto, moneda, método e instrucciones se copian en la inscripción/operación. Un precio general cero puede tener receptor para categorías pagadas. Precio general positivo sigue exigiendo receptor. Guardar contenido/cupo del evento conserva el receptor.

Inscripción autenticada con comprobante queda PENDING_REVIEW; revisión por propietario confirma mediante el circuito existente. Las categorías gratuitas también pasan a revisión manual. QR/comprobantes son privados; el acceso existente se valida por evento/inscripción. Tras recibir inscritos, método/categoría no cambian, y snapshots anteriores se conservan.

Migraciones 029 (ámbitos personales y referencias) y 030 (receptor para precios por categoría) aplicadas únicamente en invictus e invictus_test locales. Ambas deben aplicarse antes del backend en producción. Prisma generado; no se desplegó producción. Las claves SQL compuestas históricas se conservan además de las relaciones simples del schema y el trigger de validación de ámbito; usar migraciones versionadas, no db push.

Validación: tests/event-setup.test.js, tests/category-registrations.test.js, tests/event-teams.test.js; npm run build; scripts/check-personal-payments-ui.js sobre base de pruebas local con navegador desktop/mobile. Participantes sin cuenta y consulta privada de estado quedan para el siguiente incremento.
