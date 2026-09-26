# Configuración de disciplinas, categorías y pagos

Incremento del 2026-09-25. Cada participante tendrá una sola categoría por evento. Se mantiene la unicidad existente de EventRegistration por evento y usuario.

## Uso

1. En Mis Teams, un propietario registra métodos de pago: Yape, Plin, transferencia o efectivo. Se permiten varias cuentas del mismo tipo. Las cuentas se desactivan, no se eliminan. Yape/Plin usan soles; transferencia/efectivo admiten PEN o USD.
2. En el formulario del evento se selecciona la disciplina.
3. En Mis eventos → Categorías y pagos, OWNER/ADMIN crea categorías y selecciona métodos activos del Team. Cada categoría configura precio, moneda, cupo opcional y restricciones opcionales. Precio cero significa gratuita.
4. Al enviar a revisión o publicar se verifica disciplina activa, al menos una categoría activa y método activo de moneda compatible para cada categoría pagada. El ADMIN global puede consultar la propuesta, sin obtener números de cuenta ni permiso de editar el Team.

Categorías, disciplina y selección de métodos quedan bloqueadas fuera de borradores editables o tras la primera inscripción. La etapa 4 reserva cupo del evento/categoría y valida edad/género al inscribirse.

## Alcance y compatibilidad

La configuración inicial se completó el 2026-09-25. La etapa 4 ya permite inscripción por categoría y revisión de pagos; ver [inscripciones](category-registrations.md). Los eventos sin categorías mantienen su flujo gratuito existente.

La etapa 4 agregó categoryId, elección de método, snapshots de importe/moneda/instrucciones, comprobantes y revisión. No se ha creado un segundo circuito de pagos: el Team enlaza un PaymentRecipient al guardar su primer método, para reutilizar PaymentOperation y ManualPayment. RecipientMember sigue separado de TeamMember. El usuario confirmó usar la edad cumplida el día del evento.

Los QR son StoredFile privados; OWNER/ADMIN acceden mediante la ruta del Team, incluso si otra persona cargó el archivo. Ni el catálogo público ni la propuesta de moderación devuelven teléfonos, cuentas bancarias o QR. Los archivos referenciados no se pueden eliminar.

## API

- `GET /api/disciplines`: catálogo público activo.
- `GET /api/events/:id/setup`: configuración para gestores o moderación global.
- `POST /api/events/:id/categories`, `PUT /api/events/:id/categories/:categoryId`: guardar categoría completa.
- `PUT /api/events/:id/payment-methods`: sustituir selección `{methodIds: [...]}`.
- `GET/POST /api/teams/:id/payment-methods`, `PUT /api/teams/:id/payment-methods/:methodId`: consultar/configurar cuentas.
- `GET /api/teams/:id/payment-methods/:methodId/qr`: contenido privado autorizado por membresía.

## Base de datos

Migración `20260925018_event_configuration`: tablas nuevas, catálogo inicial, columnas opcionales y relaciones. No contiene DROP, DELETE ni truncado de tablas existentes. Las relaciones compuestas garantizan que evento y método pertenecen al mismo Team.

Aplicada a `invictus` e `invictus_test` locales. Neon no se ha modificado. Para desplegar, configurar DATABASE_URL del destino y ejecutar `npx prisma migrate deploy`; el alias `npm run db:deploy` requiere además CONFIRM_DATABASE con host:puerto/base. Regenerar cliente Prisma para el despliegue. No usar db push ni migrate reset.

## Verificación

`node --env-file=.env --test tests/event-setup.test.js tests/integration.test.js`: 3/3 aprobadas. Permisos, aislamiento de cuentas, privacidad de QR, restricciones, publicación, bloqueo del flujo gratuito y regresiones existentes de pagos/inscripciones. Ejecución restringida a invictus_test local.

`npm run build`: web y administración aprobados. Recorrido visual `node --env-file=.env scripts/check-event-setup-ui.js` aprobado: crear método de Team, seleccionar disciplina, crear categoría, habilitar método y enviar a revisión. Capturas a 1440/390 px inspeccionadas en `.local/screenshots/event-setup-desktop.png` y `event-setup-mobile.png`, sin overflow horizontal. Las capturas y cargas privadas requirieron ejecución fuera del sandbox por EPERM.
