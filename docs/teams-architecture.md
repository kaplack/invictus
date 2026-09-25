# Teams: análisis y plan de incorporación

Fecha: 2026-09-25. Etapa 0: revisión estática del repositorio; no se consultó ni modificó producción y no se ejecutaron migraciones. Las propuestas siguientes no representan funcionalidad implementada.

## 1. User, autenticación y Event actuales

`prisma/schema.prisma` define User con rol global string (USER por defecto), estado ACTIVE/SUSPENDED y sesiones persistidas. `vendor/usuarios-acceso/src/auth/auth.service.js` registra sin aceptar un rol del cliente, almacena hashes de contraseña y de token, y consulta el usuario al autenticar cada petición. `server/app.js` monta sesiones por cookie, comprobación de origen y routers compartidos por la web y el admin. Reutilizar esa identidad; no introducir otro login ni guardar los roles de Team como parte de un token.

Event tiene `organizerId` obligatorio hacia User, imágenes, beneficios, slug público, estado de publicación, `source` y revisión de Invictus. No existen Team, Discipline ni EventCategory. `type` es texto opcional y no equivale a un catálogo de disciplinas. No debe migrarse automáticamente sin revisar sus valores.

## 2. Propietario y creador actuales

`vendor/gestion-eventos/src/service.js` asigna organizerId al creador y permite gestionar por coincidencia de ID o rol interno SUPERADMIN. Esa autorización también aparece en inscripciones y su coordinador; modificar solo las rutas dejaría validaciones incompatibles.

`server/personal-events.js` permite al usuario autenticado crear eventos EXTERNAL, adaptándolo internamente como ORGANIZER. Solo se editan borradores o eventos devueltos; se envían a revisión y un ADMIN aprueba o solicita cambios. `server/services.js` crea eventos INVICTUS desde administración. En ambos caminos la configuración actual fija precio cero y un cupo.

Destino: `teamId` determina propiedad y `createdByUserId` registra al creador. Conservar inicialmente organizerId para compatibilidad, sin usarlo como permiso alternativo en eventos ya migrados. El antiguo organizador es la mejor referencia disponible para migrar la identidad de creación, pero no constituye un historial auditado de transferencias.

## 3. Roles y autorización propuestos

Decisión acordada: User.role sigue siendo global; TeamMember.role es local al Team. Un USER puede ser OWNER en uno, ADMIN en otro y MEMBER en un tercero. Crear un Team no promueve el rol global.

| Acción en el Team | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Consultar su Team y miembros | Sí | Sí | Sí |
| Editar información operativa | Sí | Sí | No |
| Administrar miembros y roles | Sí | No | No |
| Configurar métodos de pago | Sí | No, propuesta inicial | No |
| Administrar eventos e inscripciones | Sí | Sí | No |
| Revisar comprobantes de sus eventos | Sí | Sí | No |

Propuesta de compatibilidad: ADMIN global conserva moderación/publicación de eventos externos; no obtiene por ello acceso nuevo a comprobantes de todos los Teams. Sus permisos históricos sobre pagos de tienda se mantienen. La interfaz de Team vive en la web autenticada y no requiere abrirle el panel global a cualquier OWNER.

Agregar un servicio local de autorización que consulte membresía vigente y Team activo. Los módulos de eventos e inscripciones necesitan un punto de autorización explícito y compatible con sus consumidores antiguos; no simular que el actor es el creador ni promoverlo a SUPERADMIN para saltar comprobaciones. Aplicar el mismo alcance a listados, detalle, escrituras, archivos y pagos.

Bloquear la fila de Team antes de cambiar membresías/roles; releer el permiso y contar owners dentro de la transacción. Todas las rutas de eliminación, salida y descenso de rol deben respetar el mismo bloqueo. Crear Team y primer OWNER atómicamente, prohibir borrado físico de Team en el piloto y probar peticiones concurrentes. La base debe imponer unicidad por usuario/Team y claves foráneas restrictivas; la garantía de último owner depende además de este protocolo transaccional.

## 4. Archivos reutilizables

`StoredFile` y `vendor/archivos-imagenes` ya ofrecen validación, visibilidad public/private, almacenamiento local o S3, borrado lógico y contenido privado firmado con caducidad. `server/app.js` selecciona el driver; esta revisión no verificó la configuración del despliegue.

El servicio genérico privado solo permite al propietario. Sin embargo, `vendor/pagos-manuales/src/service.js` ya tiene una ruta de lectura de comprobantes que primero autoriza la operación/destinatario y luego obtiene los bytes mediante el servicio de archivos. Reutilizar ese patrón con autorización actual del Team en cada lectura, en lugar de volver públicos los comprobantes o ampliar indiscriminadamente files:manage.

Logos e imágenes de eventos serán públicos; comprobantes privados. Los QR de destinatarios actuales son privados y se consultan por la operación. Conservar esa protección si se reutilizan para los métodos del Team. Al editar imágenes, permitir conservar las referencias ya autorizadas aunque las subiera otro miembro; exigir propiedad del actor para asociar una carga nueva. Revisar también el borrado de archivos usados: la salida del uploader del Team no debería invalidar assets compartidos.

## 5. Modelos y lógica a reutilizar

| Pieza | Reutilización y cambio necesario |
|---|---|
| User, Session | Identidad y rol global sin reemplazo |
| Event, EventBenefit | Agregar propiedad Team y disciplina; conservar slug, revisión e imágenes |
| ParticipantProfile | Perfil del inscrito; no convertirlo en membresía |
| EventRegistration | Extender con categoría, observación y revisión; no crear una segunda tabla de inscripciones |
| EventRegistrationConfig | Mantener compatibilidad de precio/cupo antiguo; adaptar al precio/cupo de categoría |
| PaymentRecipient | Identidad receptora del dinero; no equivale al Team ni a cada método |
| RecipientMember | Autorización histórica de destinatarios, especialmente tienda; no duplicar aquí automáticamente todos los roles de Team |
| PaymentOperation | Importe, moneda, origen e instrucciones históricas de una inscripción |
| ManualPayment, PaymentResult | Intentos, comprobantes y resultado monetario; preservar circuito transaccional |
| StoredFile | Logos, imágenes, QR y comprobantes |

Límite confirmado: pagos solo acepta cash/yape/plin y la configuración de destinatarios exige teléfono peruano tipo Yape. Transferencia, varias cuentas y métodos por evento requieren ampliar contratos y snapshots; no basta con añadir opciones en React.

La autorización de pagos hoy combina permisos globales y RecipientMember. Propuesta: un punto de autorización por operación para origen registration, resuelto desde inscripción → evento → Team; mantener la política de destinatarios para los pedidos. No otorgar payments:review global a todos los administradores de Team.

## 6. Modelos nuevos y relaciones

- Team: UUID, name, description, logoFileId opcional, contacto opcional (contactName, phone, whatsapp, email), active y timestamps. Redes sociales pueden esperar. No borrar Teams con historial.
- TeamMember: UUID, teamId, userId, role enum OWNER/ADMIN/MEMBER, joinedAt; unique(teamId,userId), índice por userId y claves foráneas restrictivas.
- Discipline: catálogo con código estable único, nombre y active.
- EventCategory: eventId, name, description, gender/minAge/maxAge/modality opcionales, priceCents, currency, capacity opcional, active y timestamps. Validaciones de límites y edad coherentes; no categorías enumeradas por deporte.
- TeamPaymentMethod: teamId, type, label, datos tipados por método, qrFileId opcional, active y timestamps. Propuesta: vincular Team a un PaymentRecipient dedicado para reutilizar operaciones; los métodos contienen las distintas cuentas/teléfonos, sin cambiar destinatarios de tienda.
- EventPaymentMethod: selección de métodos habilitados. Unicidad por evento/método y garantía de que ambos pertenecen al mismo Team, mediante validación transaccional y claves compuestas cuando se concrete el esquema.

Event agrega teamId, createdByUserId y disciplineId. EventRegistration agrega categoría y metadatos de revisión. La selección de método se vincula a la operación/inscripción y se conserva el snapshot económico. La información de comprobante debe seguir en el intento ManualPayment para pagos coordinados; no escribir copias competidoras en proofFileId de Registration. Las categorías pertenecen al evento, no directamente al Team.

## 7. Estados, cupos y decisiones pendientes

Actualmente se usan PENDING, PENDING_REVIEW, CONFIRMED, REJECTED, CANCELLED y COMPLETED. `server/services.js` confirma automáticamente las inscripciones gratuitas y las asocia al perfil. El coordinador devuelve la inscripción existente al repetir usuario/evento y fija configuración tras la primera inscripción.

El resultado de pago verified confirma la inscripción y cierra la operación. Un pago rejected deja la inscripción PENDING, conserva cupo y permite otro intento. Por eso rechazo de pago y rechazo de participación no son equivalentes. Observed debe ser una corrección recuperable sin convertir un pago rechazado en rechazo terminal de participación.

Propuesta técnica: mantener CONFIRMED como estado interno de «Aceptada» para evitar romper perfiles; añadir OBSERVED y adaptar transiciones/conteo explícitamente. No convertir CANCELLED o COMPLETED en accepted/rejected. Las cuatro etiquetas del piloto no justifican borrar los estados históricos. Definir revisión coherente de inscripción y pago en una única transacción; no revisar mediante dos endpoints independientes con resultados contradictorios.

Decisiones de producto a cerrar antes de categorías/inscripción:

1. Una inscripción por evento o varias (una por categoría). La segunda opción cambia la unicidad, idempotencia, historial y número de operaciones de pago.
2. Edad al día del evento o a una fecha de corte, y datos necesarios para validarla. Hoy el perfil no aporta una fecha de nacimiento estructurada.
3. Si pendientes/observadas reservan cupo y hasta cuándo. Propuesta inicial: mantener reserva hasta rechazo/cancelación, sin vencimiento automático; mostrarlo explícitamente al organizador.
4. Si el piloto revisa manualmente incluso inscripciones gratuitas. El documento propone pending inicial; mantener confirmación automática solo para el flujo histórico mientras se define la transición.
5. Qué correcciones se permiten tras observar: propuesta inicial datos/comprobante, sin cambiar categoría/importe después de abrir una operación.

Estas decisiones no bloquean Team y TeamMember como primer incremento independiente.

## 8. Migraciones y despliegue gradual

El repositorio contiene migraciones 001–015, incluida 015_event_review. El resumen histórico de 14 migraciones del backlog corresponde a una etapa anterior. No editar ni regenerar migraciones aplicadas.

1. Migración aditiva de Team y TeamMember con índices y constraints. Generar el cliente Prisma único. Entregar Mis Teams sin modificar eventos ni tienda.
2. Agregar Event.teamId y createdByUserId inicialmente opcionales. Preparar informe de eventos por organizerId/source y archivo explícito de asignación evento/organizador → Team; distinguir eventos INVICTUS de externos. No inferir una organización solo por nombre o dominio de correo.
3. Ejecutar relleno idempotente, en lotes/transacciones, con simulación previa: crear/asignar Teams y owners, conservar IDs, slugs, inscripciones y estados. Reportar organizadores suspendidos, relaciones faltantes y asignaciones ambiguas para resolución; no crear propietarios arbitrarios.
4. Publicar código compatible que use membresía para eventos con Team y preserve el flujo antiguo únicamente para filas todavía sin migrar. Las creaciones del flujo nuevo requieren Team. Controlar y finalmente cerrar las creaciones antiguas antes de exigir NOT NULL.
5. Verificar que no quedan eventos sin Team, owners ausentes o autorizaciones antiguas activas. Aplicar NOT NULL e índices de consulta por Team; retirar uso de organizerId como permiso. Mantener la columna de compatibilidad hasta que ningún consumidor la necesite.
6. Añadir disciplinas, categorías, métodos y selección por evento; luego inscripción/revisión y snapshots. No asignar categorías ficticias a históricos sin una regla de conversión explícita.

Antes del relleno: respaldo recuperable y ensayo con datos representativos en base aislada. Durante fases aditivas se puede desactivar la nueva UI manteniendo datos. Después del cambio de autorización no volver a desplegar código antiguo que recupere permisos por creador; recuperar hacia adelante o restaurar de forma coordinada. No ejecutar migrate reset ni db push en producción. `scripts/migrate.js` exige destino confirmado y restringe --test a invictus_test local.

## 9. API y pantallas: primer incremento

Propuesta de API autenticada:

| Ruta | Contrato |
|---|---|
| GET /api/teams | Solo membresías del actor, Team resumido y rol local |
| POST /api/teams | Datos validados; creación atómica y OWNER; rechazar role/ownerId enviados |
| GET /api/teams/:id | Miembro vigente; detalle y capacidades calculadas |
| PATCH /api/teams/:id | OWNER/ADMIN; campos operativos permitidos |
| GET /api/teams/:id/members | Miembro; nombre y rol, sin directorio global de correos |
| POST /api/teams/:id/members | OWNER; agregar usuario registrado por correo exacto normalizado, con control de frecuencia |
| PATCH /api/teams/:id/members/:memberId | OWNER; cambio de rol y protección del último owner |
| DELETE /api/teams/:id/members/:memberId | OWNER; eliminación de membresía con la misma protección |

No exponer búsqueda global de usuarios al Team. Validar pertenencia de memberId al teamId de la ruta. Respuestas consistentes 401 sin sesión, 404 para recursos ajenos, 403 para miembro sin capacidad, 409 por conflicto de último owner/duplicado y 400 por entrada inválida. Paginar listados al implementar; retornar DTOs limitados, nunca User completo.

Pantallas afectadas:

- `client/src/app/Application.jsx`, `components/UserMenu.jsx`: acceso y rutas protegidas de Mis Teams, incluyendo subrutas.
- Nueva página de Teams: listado, creación, detalle y miembros; reutilizar api, hooks de datos/acciones, Modal, Field, Feedback y Records. Estados de carga, vacío, error y permisos; móvil y teclado.
- `pages/MyEvents.jsx` y EventForm/Attendees de `pages/Manage.jsx`: Team seleccionado, eventos accesibles, disciplina, categorías, pagos y revisión de inscritos en fases siguientes.
- `pages/Public.jsx`: Team organizador, categorías, precio y flujo de inscripción.
- `pages/Account.jsx`: historial enriquecido, observación y reenvío, sin alterar pedidos de tienda.
- `app/AdminApplication.jsx` y `pages/Manage.jsx`: conservar revisión global de eventos, mostrar organización y diferenciarla de la administración de miembros. Usuarios y acceso sigue cambiando únicamente User.role.
- `components/UI.jsx`: etiquetas para los estados nuevos sin cambiar las de pedidos/pagos por coincidencia de nombres.

## 10. Riesgos y verificación por entrega

| Riesgo concreto | Comprobación necesaria |
|---|---|
| Usuario conserva acceso por organizerId tras salir | Dos Teams, creador expulsado, roles diferentes y acceso directo por ID |
| Dos owners se eliminan simultáneamente | Prueba concurrente PostgreSQL; al menos uno permanece |
| Rol de Team abre admin/tienda | USER propietario conserva role y no accede a APIs globales |
| Otro miembro no puede conservar imagen existente | Edición por dos administradores y rechazo de archivos nuevos ajenos |
| Comprobante accesible tras revocar membresía | Leer por ruta de pago, revocar y repetir; rechazar usuario ajeno/MEMBER |
| Duplicidad y sobreventa por categorías | Último cupo y reenvíos simultáneos bajo política acordada |
| Cambiar cuenta altera inscripción anterior | Snapshot conserva monto, moneda y datos del pago anterior |
| CONFIRMED/perfil y pagos quedan descoordinados | Recorrido gratuito antiguo, pagado nuevo y observación/reenvío |
| Cambios en módulo compartido rompen tienda | Pedido, pago manual, comprobante, rechazo, cancelación y stock |
| Migración modifica publicación o enlaces | Comparar IDs, slugs, revisión, conteos y relaciones antes/después |

Primer corte verificable: usuario crea Team, sigue siendo USER, lo ve en Mis Teams y administra miembros con protección del último OWNER. Un segundo usuario con MEMBER no edita; un tercero sin membresía no lee. Pruebas con sesiones reales y PostgreSQL local aislado, build web/admin y revisión responsive. No se necesitan pasarelas, dashboards ni nuevas dependencias para ese corte.

## Orden de ejecución

1. Teams/membresías completos (datos, permisos, API, UI y pruebas).
2. Migración y administración de eventos por Team, manteniendo moderación de Invictus.
3. Disciplinas, categorías y métodos por Team/evento, tras cerrar reglas pendientes.
4. Inscripción, revisión y corrección con pagos y archivos reutilizados.
5. Ensayo integral del evento y regresiones de tienda/admin.

Evidencia de esta etapa: revisión de schema, migraciones, composición de servicios, auth, políticas de eventos/pagos/archivos, coordinador de inscripciones, rutas React y pruebas de integración existentes. No se ejecutaron tests funcionales porque esta entrega solo agrega análisis; no certifica el estado del despliegue ni la integridad de datos reales.
