# Invictus — continuidad

Actualizado: 2026-09-25.

## Estado actual
2026-09-25: etapa 2 en curso. Implementada la transición de eventos a Team (nuevos obligatorios; históricos opcionales), autorización por membresía, selección de Team y script de reporte/simulación/asignación. Migración 017 aplicada en invictus e invictus_test locales; cliente Prisma regenerado. Pruebas backend 3/3 y recorrido visual de eventos por Team a 1440/390 px aprobados. El reporte local encontró 2 eventos históricos sin Team; no se asignaron automáticamente ni se modificó producción. Detalle: [migración de eventos](docs/event-team-migration.md).
2026-09-25: Teams y membresías implementados y verificados con API y “Mis Teams”, roles locales, logo/contacto y gestión de miembros. Migración 016 aplicada a invictus e invictus_test locales; cliente Prisma generado. Build web/admin, 3 pruebas de integración y recorrido visual a 1440/390 px aprobados. Producción no modificada. Siguiente incremento: eventos por Team y migración de propiedad; ver [análisis](docs/teams-architecture.md) y [operación de Teams](docs/teams.md).
2026-09-24: el usuario confirma que Invictus está publicado en Vercel, Render, Neon y AWS S3. Despliegue reportado por el usuario; no verificado en esta revisión.

Etapa 1 completada localmente. Solo existía Invictus_Project_Kickoff.docx, conservado. Git inicializado en main. Paquetes seleccionados incorporados como workspaces locales portables; schema compuesto mediante compositor oficial, historial 001–013 conservado más migración propia 014.

## Decisiones
- Alcance actualizado el 2026-09-24: preparar un piloto de eventos organizados por Teams con inscripciones y revisión manual de pagos. Esto sustituye la exclusión previa de inscripciones pagadas; resultados/logros siguen fuera del alcance nuevo.
- Roles actuales globales: USER, ORGANIZER y ADMIN. Separación acordada para Teams: `User.role` conserva los permisos de plataforma; `TeamMember.role` determina OWNER, ADMIN o MEMBER dentro de cada Team. Crear un Team o cambiar una membresía no cambia `User.role`. Mantener ORGANIZER durante la transición y retirar su uso para autorizar eventos una vez migrados. La adaptación interna actual de ADMIN a SUPERADMIN no debe trasladarse automáticamente a los nuevos permisos de Team.
- Tienda exclusivamente para existencias físicas. Cotizaciones personalizadas separadas, sin reservar stock ni representar producción.
- Política reserve-until-terminal; cupo inmutable tras primera inscripción.
- Bases localhost:5432/invictus e invictus_test confirmadas y migradas. Las credenciales permanecen solo en .env.\n- Web pública y administrador son entradas Vite separadas: 5173 y 5175, con backend compartido en 3100.\n- Paleta oficial: #D6AE16, #171717, #F7F5EF, #6B7075, #F1D760, #1E3A5F.

## Pendientes
Pendiente de confirmar: creación de la cuenta admin@invictus.pe y ejecución de setup:admin después del registro. La publicación ya fue reportada por el usuario; el estado de GitHub privado queda por confirmar.

### Backlog posterior a la publicación
1. [x] **Mejorar la UX/UI del menú de navegación.** Implementado localmente el 2026-09-24: navegación principal organizada en Eventos, Reconocimientos y A medida; accesos separados al carrito y al menú de cuenta, con Gestión según rol. Hasta 1100 px, menú hamburguesa a la izquierda, logotipo centrado y carrito y usuario a la derecha sin nombre. El desplegable se cierra al navegar, pulsar fuera o usar Escape. Compilación web aprobada; prueba visual manual realizada por el usuario, según su confirmación del 2026-09-24.
2. [ ] **Completar la gestión de eventos e inscripciones del piloto.** Desarrollada en las etapas siguientes: eventos propiedad de un Team, categorías configurables, métodos de pago del Team y revisión manual de inscripciones.
3. [x] **Implementar Teams y membresías.** Etapa 1 completada localmente el 2026-09-25, con roles por Team separados del rol global del usuario. Pendiente despliegue; vinculación de eventos en etapa 2.
4. [ ] **Agregar un dashboard para el administrador.** Definir los indicadores, resúmenes y acciones que necesita el administrador antes de implementar.

### Teams y primer evento real — plan pendiente

Registrado el 2026-09-24. El estado de cada etapa se indica abajo. Priorizar cambios pequeños y reutilizar los módulos existentes; pruebas mínimas solicitadas por el usuario el 2026-09-25, manteniendo las necesarias para permisos e integridad.

#### Etapa 0 — análisis y decisiones previas
- [x] Completar el análisis de User, Event, autenticación, permisos, archivos, almacenamiento, frontend y admin. Revisión estática del 2026-09-25 documentada en [docs/teams-architecture.md](docs/teams-architecture.md), con modelos, relaciones, migraciones, pantallas y riesgos. Datos/despliegue reales no verificados.
- [ ] Revisar `Event.organizerId`, los eventos personales EXTERNAL y su revisión por Invictus. Definir los permisos de moderación del ADMIN global frente a los roles del Team; propuesta inicial: conservar la aprobación de eventos externos.
- [x] Evaluar reutilización de EventRegistration, EventRegistrationConfig, PaymentRecipient, RecipientMember, PaymentOperation, ManualPayment, PaymentResult y StoredFile. Análisis del 2026-09-25: mantener coordinador/operaciones/intentos; ampliar autorización por Team, tipos de pago y snapshots. Transferencias y observaciones todavía no están soportadas. RecipientMember permanece distinto de TeamMember.
- [ ] Definir si se permite una o varias categorías por participante/evento; hoy existe unicidad por evento y usuario. Precisar edad de referencia, validación de categorías, reserva/liberación de cupos y tratamiento de inscripciones observadas. Revisar la política actual reserve-until-terminal y la inmutabilidad del cupo.
- [ ] Definir compatibilidad de los estados actuales de inscripción y de la confirmación automática de inscripciones gratuitas con el nuevo flujo de revisión. No eliminar estados ni funciones históricas sin analizar sus dependencias.

#### Etapa 1 — Teams, membresías y permisos
- [x] Crear Team con nombre, descripción, logo mediante StoredFile, contacto opcional, active y timestamps. Team representa a la organización. No se expone borrado ni cambio de active en esta entrega.
- [x] Crear TeamMember con teamId, userId, role y joinedAt; unicidad `(teamId, userId)` e índice por usuario. Un usuario puede pertenecer a varios Teams con distintos roles.
- [x] Permitir que cualquier usuario autenticado cree un Team; creación atómica con membresía OWNER sin modificar User.role.
- [x] Centralizar autorización de Teams/membresías en backend: OWNER edita y administra miembros; ADMIN edita información operativa; MEMBER consulta. Sin acceso implícito por ADMIN global. La autorización de eventos/inscripciones/pagos se implementará en sus etapas; configuración de pagos reservada inicialmente al OWNER.
- [x] Proteger al último OWNER frente a eliminación o cambio de rol con bloqueo transaccional por Team y revalidación del actor. Prueba concurrente aprobada; ADMIN no puede modificar membresías.
- [x] Implementar “Mis Teams”: listar, crear, entrar, mostrar rol y ofrecer edición según permisos; logo y contacto opcionales. Recorrido real de escritorio/móvil aprobado.
- [x] Implementar miembros: listar nombre/rol, agregar cuentas activas por correo exacto, cambiar roles y eliminar membresías; paginación y límite de frecuencia al agregar. Sin directorio global ni invitaciones por correo. Permisos y revocación verificados con sesiones reales.

Evidencia etapa 1 (2026-09-25): `npm run build` aprobado; `node --env-file=.env --test tests/teams.test.js tests/integration.test.js` 3/3 aprobadas; `node --env-file=.env scripts/check-teams-ui.js` aprobado, con capturas inspeccionadas `.local/screenshots/teams-desktop.png` y `teams-mobile.png`, sin overflow móvil y retorno de foco al cerrar modal. Fallos EPERM de Prisma/archivos/capturas resueltos ejecutando con permisos fuera del sandbox; dos selectores del script visual se ajustaron a la UI actual. No se amplió la batería tras la solicitud de pruebas mínimas. Prueba manual del usuario pendiente.

#### Etapa 2 — propiedad y migración de eventos
- [x] Añadir teamId a Event y conservar la identidad del creador para auditoría. Autorizar creación/gestión mediante OWNER o ADMIN del Team propietario, nunca por conocer el ID, por ser creador o solo por tener ORGANIZER global.
- [x] Preparar una migración revisable de eventos existentes: teamId inicialmente nullable, asignación explícita mediante reporte/mapa, simulación, aplicación idempotente y rollback transaccional. El reporte local encontró 2 filas sin candidatos; no se aplicó ninguna asignación automática. NOT NULL queda pendiente de la revisión de producción.
- [x] Adaptar servicios, rutas, “Mis eventos”, formularios, detalle público e historial a eventos de los Teams del usuario. Mostrar Team organizador y mantener la separación entre administración del Team y moderación de Invictus. Build y UI escritorio/móvil aprobados.
- [ ] Eliminar la dependencia del rol global ORGANIZER para gestionar eventos cuando toda la transición esté validada; revisar también permisos de imágenes previamente ligados al creador individual.

Evidencia etapa 2 (2026-09-25): `npm run build` aprobado; `node --env-file=.env --test tests/event-teams.test.js tests/integration.test.js` 3/3 aprobadas con PostgreSQL local; `node --env-file=.env scripts/event-team-migration.js` generó reporte de 2 eventos históricos sin Team; `node --env-file=.env scripts/check-event-team-ui.js` aprobado, con selector de Team, creación, envío a revisión y capturas `event-team-*.png` a 1440/390 px sin overflow. Producción no modificada. Falta revisión humana del mapa de históricos y despliegue normal.

#### Etapa 3 — disciplinas, categorías y métodos de pago
- [ ] Crear catálogo general Discipline y asociarlo a Event; comenzar con natación sin limitar el modelo a ella.
- [ ] Crear EventCategory propia de cada evento: nombre, descripción y restricciones opcionales de género, edad y modalidad; precio en unidades menores, cupo opcional, estado y timestamps. Evitar categorías globales rígidas y conservar compatibilidad de eventos antiguos.
- [ ] Configurar métodos de pago del Team: múltiples Yape, Plin, transferencias y efectivo, incluso del mismo tipo. Datos según tipo: etiqueta, titular, teléfono, banco, cuenta, CCI/moneda cuando corresponda, instrucciones y QR opcional mediante archivos existentes.
- [ ] Permitir seleccionar los métodos habilitados por evento mediante una relación, sin duplicar su configuración. Validar que pertenecen al Team propietario; desactivar métodos usados en lugar de borrar referencias históricas.
- [ ] Conservar importe, moneda e instrucciones históricas en la inscripción/operación reutilizando los snapshots existentes; cambios posteriores de categoría o cuenta no deben alterar operaciones anteriores.

#### Etapa 4 — inscripción y revisión manual
- [ ] Extender la inscripción existente: categoría, precio, datos requeridos, método habilitado y comprobante cuando corresponda; efectivo con comprobante opcional. Validar en backend categoría/evento/Team/método y calcular el importe en servidor.
- [ ] Reutilizar archivos privados y almacenamiento local/S3 para comprobantes. Autorizar lectura al participante propietario y a OWNER/ADMIN del Team organizador, con acceso temporal y sin URL pública permanente; impedir acceso a otros participantes y miembros sin permisos.
- [ ] Implementar el flujo propuesto pending → accepted/observed/rejected y observed → pending tras corrección/reenvío, con motivo de observación. Resolver el mapeo/migración de estados existentes antes de cambiar contratos compartidos con pagos, perfiles u otras funciones.
- [ ] Registrar revisión, usuario revisor, fechas y cambios de estado con auditoría básica. Coordinar resultado de pago e inscripción sin crear dos decisiones contradictorias.
- [ ] Crear administración de inscripciones por evento: búsqueda, filtros por categoría/estado, participante, método, comprobante, aceptar/observar/rechazar y resumen de cantidades/cupos.
- [ ] Adaptar “Mis inscripciones”: evento, Team, categoría, importe, método, estado y observación; permitir corregir y reenviar las observadas.

#### Etapa 5 — validación del piloto y regresiones
- [ ] Probar aislamiento entre dos Teams, usuarios con distintos roles por Team, revocación de membresía, acceso directo por ID y privacidad de comprobantes.
- [ ] Probar último OWNER concurrente, último cupo, duplicados/reenvíos, cambios de precio/método e historial de revisión.
- [ ] Verificar migración con eventos e inscripciones existentes, publicación/revisión de eventos, tienda, productos, pedidos, pagos y perfiles. Validar frontend y admin con un recorrido completo del piloto.

Fuera del alcance nuevo: pasarela o API de Yape/Plin, validación automática de pagos, cronometraje, resultados, rankings, certificados, dorsales, check-in QR, invitaciones complejas, chat, permisos por módulos y notificaciones avanzadas. No retirar funciones existentes relacionadas sin revisar compatibilidad. El dashboard global continúa como tarea independiente; el piloto solo requiere resúmenes operativos sencillos.

## Bloqueos
Antecedente local (2026-09-23): el navegador integrado no arrancó por un fallo del sandbox; la prueba visual alternativa con Edge oculto sí pasó y guardó capturas en .local/screenshots.
2026-09-24: acceso por terminal de Codex restablecido tras corregir el propietario de .git. Navegador integrado pendiente de volver a comprobar.
## Evidencia local — incremento backend
2026-09-23: ambas conexiones verificadas sin divulgar secretos. Las bases confirmadas estaban vacías; se aplicaron 14 migraciones a invictus e invictus_test. Cliente único Prisma 6.19.0 generado.
`npm run test:integration`: 1/1 aprobada. Cookies reales, PostgreSQL, roles, evento publicado, inscripción gratuita confirmada y perfil, último cupo, última unidad, checkout idempotente, pago manual verificado, rechazo de cancelación pagada, cancelación repetida con stock restituido una vez, cotización y archivos privados. No hay identidad HTTP simulada; roles de fixtures provisionados directamente en la base de prueba.
Frontend implementado. `npm run build` compila web y admin. Prueba visual alternativa aprobada: registro/login, evento, producto, inscripción/perfil, carrito/pedido/pago y responsive 390/1440; capturas en .local/screenshots. Paleta oficial incorporada y referencia preservada en docs/brand.

