# Módulo 7: inscripciones y participación en eventos

Parte 4: [adaptadores, contratos de uso y límites de integración](../../docs/adaptadores-integracion.md). Los nuevos flujos de cobro requieren cerrar la parte 5 antes de habilitarse.

**Paso 3:** entrada raíz `@base/inscripciones-eventos` corregida y dependencias explícitas. Los adaptadores se validan al construir; adjuntar comprobante sin `fileService.assertOwned` devuelve error controlado. La integración monetaria real sigue pendiente. Ver [uso y compatibilidad](../../docs/modulos-independientes.md).

**Actualización 22/09/2026:** disponible `createPrismaRegistrationStore(database, { eventReader, Prisma })` en `src/prisma-store.js`/`src/index.js`. Usar la [composición y migraciones vigentes](../../docs/persistencia-prisma.md), no el SQL suelto histórico indicado más abajo. Persistencia/QR y lector real de eventos verificados en PostgreSQL 15 aislado. Map y BD conservan unicidad incluso tras cancelación. No están listos pagos/cupos transaccionales; la demo mantiene sus adaptadores ficticios.

Módulo genérico para eventos publicados de cualquier tipo. Permite inscripción única por usuario/evento, cupo opcional, instrucciones Yape manuales, comprobantes, revisión del organizador, supervisión del superadmin y validación pública de participación.

## Dependencias, migración y permisos

Depende de Node >=22.12, Express, `qrcode`, módulo 1 (identidad), módulo 6 (`event.id`, `organizer_id`, publicación y datos públicos), módulo 4 (adaptador `paymentService.getInstructions(paymentRecipientId)`) y módulo 2 (adaptador `fileService.assertOwned(fileId,userId)`). El módulo 3 puede alojar las rutas administrativas. La migración `prisma/migration.sql` crea `event_registrations`, unicidad `(event_id,user_id)`, estados, snapshot JSONB, comprobante, código único y `profile_id` nullable para una asociación futura y genérica. Aplicarla después de usuarios, archivos y eventos.

Estados: `PENDING`, `PENDING_REVIEW`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`. El participante ve solo lo propio; el organizador solo sus eventos; `SUPERADMIN` supervisa todo. La página pública muestra código, evento, fecha, ubicación y estado, nunca usuario, comprobante o pago.

## API, ejemplo e incorporación

Montar `createRegistrationRouter({service,getUser})` en `/api/registrations`: crear, consultar propia, adjuntar comprobante, listar/revisar por evento y validar `/public/:code`. `npm run dev:registrations` inicia el ejemplo ficticio en `http://127.0.0.1:3210`; `npm run test:registrations` ejecuta las pruebas mínimas. Para otra aplicación, copiar el módulo, aplicar la migración, inyectar repositorio PostgreSQL transaccional, sesión, adaptadores 2/4, `publicBaseUrl` y permisos del servidor. No usar el store en memoria fuera de demo/pruebas.

Pruebas realmente ejecutadas: `npm run test:registrations` (4 pruebas, cubre los 8 criterios solicitados). No se ejecutaron suites completas, PostgreSQL, navegador ni almacenamiento externo.
