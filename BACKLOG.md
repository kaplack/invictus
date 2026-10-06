# Invictus — continuidad

Actualizado: 2026-10-03.

## MVP Eventos + Inscripciones — alcance vigente 2026-10-02

El nuevo MVP sustituye el piloto centrado en Teams. Prioridad: reutilizar, simplificar y ocultar; conservar modelos y datos. Organizador personal con Profile básico; participantes sin cuenta; Yape/Plin y revisión manual; eventos informativos del ADMIN existente. Sin reescritura ni borrados destructivos.

- [x] Primer incremento: creación personal sin Team, perfil requerido en servidor (nombres, apellidos, DNI y teléfono), conexión de Mis eventos a pantalla existente. Sin migraciones; permisos de Teams conservados.
- [x] Perfil mínimo visible: nombres, apellidos, DNI y teléfono en un único formulario; guardado parcial conserva perfil ampliado y módulos existentes.
- [x] Profile es fuente de identidad para sesión y consumidores existentes; no se copian nombres nuevos a User. Respaldo histórico solo sin Profile y snapshots preservados. Sin migraciones.
- [x] Publicación/despublicación personal y edición segura: acciones autenticadas, propiedad validada, DRAFT/PUBLISHED existentes, sin borrar inscritos; fecha/zona horaria/disciplina/cupo fijos tras recibir inscripciones. Configuración de pago preservada al editar contenido.
- [x] Eventos informativos en administración: Event reutilizado con mode MANAGED/INFORMATIONAL, publicOrganizerName y externalUrl; ADMIN crea/edita/publica/despublica sin Team ni cupo. Source conserva semántica anterior. Ficha anónima con CTA externo; inscripciones bloqueadas en backend y edición personal excluida.
- [x] Categorías y métodos personales Yape/Plin: TeamPaymentMethod admite Team o evento personal; selector y formulario existentes reutilizados, QR privado opcional y receptor en EventRegistrationConfig. Precios en soles, configuración en borradores sin inscritos y confirmación manual reutilizada.
- [x] Inscripción invitada, comprobantes privados, idempotencia por token y consulta privada de estado; corrección de observaciones y revisión desde consola existente. Migración 031 solo local.
- [x] Consola existente admite invitados; Home compacto con cards compartidas y búsqueda; Teams/comercio ocultos en navegación, formulario principal y rutas visibles del MVP. Modelos/APIs conservados.
- [ ] Verificar recorridos completos y compatibilidad histórica.

La publicación personal ya es directa y el perfil visible es básico. Teams conserva revisión; categorías/pagos personales e invitados continúan pendientes. No representa el MVP completo. Verificación: tests/event-teams.test.js 2/2 aprobadas contra invictus_test local (perfil incompleto, propiedad personal, edición, acceso ajeno y regresión Team); npm run build web/admin aprobado. Sin migraciones ni despliegue. Segundo incremento: tests/event-teams.test.js + tests/athlete-profile.test.js 4/4 aprobadas; build web/admin aprobado; recorrido UI scripts/check-mvp-personal-ui.js a 1440/390 px aprobado (perfil, crear, publicar, ficha y despublicar); capturas en .local/screenshots/mvp-*.png. Contraste de consola personal y acciones de perfil corregido; recorrido repetido aprobado y capturas inspeccionadas. Sin migraciones ni despliegue.

## Eventos informativos — incremento 2026-10-02

Migración 028 aditiva aplicada únicamente a invictus e invictus_test locales; Prisma regenerado. Las filas anteriores reciben MANAGED. Sin tablas nuevas ni borrados; creador y administrador siguen usando relaciones existentes, organizador real separado como nombre público. Producción pendiente de migración y despliegue.

Verificación: 5/5 pruebas de eventos/configuración/inscripciones aprobadas; 3/3 de eventos repetidas tras cerrar edición personal; build web/admin aprobado; scripts/check-informational-events-ui.js aprobado con admin y ficha anónima a 1440/390 px, sin desbordamiento ni errores de página. Capturas inspeccionadas en .local/screenshots/informational-*.png. La incidencia de service worker del servidor de prueba se resolvió igualando publicDir al Vite real. Ver [detalle](docs/informational-events.md).

Siguiente incremento: categorías y métodos personales Yape/Plin. Home todavía pendiente; los informativos aparecen en el catálogo público de eventos existente.

## Pagos personales — incremento 2026-10-02

Migraciones 029/030 aplicadas solo a invictus e invictus_test locales; Prisma regenerado. Se extiende team_payment_methods con event_id y team_id opcional (exactamente un ámbito); event_payment_methods conserva claves compuestas históricas y añade referencias simples y validación SQL de ámbito. Sin tablas nuevas, renombrados ni borrados. La restricción histórica del receptor se adapta para eventos con precio general cero y precios por categoría, conservando receptor obligatorio para precio general positivo.

Métodos personales se configuran en Categorías y pagos de Mis eventos, usando MethodForm existente. Solo Yape/Plin en PEN; creación habilita el método en el evento. Los comprobantes, QR, operaciones, snapshots y revisión reutilizan el circuito existente. Editar contenido/cupo antes de inscripciones conserva receptor. Con inscritos, categorías/métodos quedan fijos aun al despublicar. Participantes todavía requieren cuenta; invitados es el siguiente incremento.

Verificación: 6/6 pruebas de eventos/configuración/inscripciones aprobadas (incluyen circuito personal completo, QR privado, aislamiento de métodos y revisión); build web/admin aprobado; scripts/check-personal-payments-ui.js aprobado a 1440/390 px, con creación de categoría/Yape/QR, inscripción PENDING_REVIEW y confirmación CONFIRMED. Capturas en .local/screenshots/personal-*.png. Ver [detalle](docs/personal-event-payments.md). Producción sin migraciones ni despliegue.

## Estado actual
2026-10-02: diseño de Trayectoria/CV deportivo, resultados, verificación, badges y credenciales documentado en cuatro releases futuros. Sin implementación ni cambios de alcance del piloto. Ver sección Trayectoria deportiva y credenciales en Pendientes.
2026-10-02: Deportes implementado con catálogo Discipline existente, edición local, principal opcional e identidad compacta. Relación ParticipantDiscipline con clave compuesta e índice SQL de principal único; JSON histórico preservado como archivo de solo lectura y migración de coincidencias inequívocas. Migración 026 aplicada a invictus e invictus_test locales; Prisma generado. Pruebas mínimas: 2 casos nuevos agrupados + 5 regresiones relevantes, 7/7 aprobados; build:web y recorrido visual 1440/390 px aprobados. Producción y Trayectoria pendientes. Ver [deportes del perfil](docs/profile-sports.md).
2026-10-02: Presencia digital implementada: sitio web opcional, cinco redes, normalización/validación backend, guardado transaccional parcial e iconos accesibles en identidad. Información y Contacto conservados. Migración 025 aplicada a invictus e invictus_test locales; Prisma generado. Verificación mínima: 2 casos nuevos agrupados + 7 regresiones perfil/auth aprobadas; build:web y recorrido visual 1440/390 px aprobados. Sin dependencias nuevas, perfil público, Deportes ni Trayectoria. Producción pendiente. Ver [presencia digital](docs/digital-presence.md).
2026-10-01: Contacto muestra User.email en input de solo lectura antes del teléfono, con explicación de que todavía no se puede modificar. No se duplica ni se envía al guardar perfil. Comprobación mínima de valor, readOnly, foco y móvil aprobada.
2026-10-01: botón circular de cámara junto al borde inferior derecho del avatar; conserva selector, vista previa y guardado de Información. Verificación puntual de apertura del selector y capturas escritorio/móvil aprobada, sin ampliar pruebas.
2026-10-01: registro mínimo con username, correo y contraseña implementado y verificado localmente. Disponibilidad con debounce 450 ms, unicidad PostgreSQL y contraseña 8–128; login por email, scrypt y sesiones conservados. Migración 023 aplicada a invictus e invictus_test locales; las tres cuentas de desarrollo conservan sus datos y reciben username único. 16 pruebas backend aprobadas, build web/admin aprobado y recorrido puntual de registro/login con capturas 1440/390 px aprobado. Sin ampliar pruebas tras la solicitud del usuario. Producción pendiente de migración/despliegue; ParticipantProfile no se amplió. Ver [registro](docs/user-registration.md).
2026-09-26: etapa 5 cerrada como validación técnica local mínima; 1 caso complementario aprobado y evidencia anterior reutilizada. No se modificó producción ni código de aplicación. Detalle: [validación del piloto](docs/pilot-validation.md).
2026-09-26: etapa 4 implementada localmente: inscripción por categoría, reserva transaccional de cupos, comprobantes privados, revisión OWNER/ADMIN, observación/corrección, auditoría y listados. Snapshots completan la tarea pendiente de etapa 3. Pruebas mínimas: 1 caso integrado nuevo + 3 regresiones aprobados, build web/admin y recorrido visual móvil/escritorio aprobados. Migración 019 aplicada a invictus e invictus_test locales; cliente Prisma regenerado. Neon no modificado. Detalle: [inscripciones](docs/category-registrations.md).
2026-09-25: configuración de etapa 3 implementada: disciplinas, categorías y métodos de pago del Team, selección por evento y permisos OWNER/ADMIN. Una categoría por participante/evento confirmada. Migración 018 aplicada solo a invictus e invictus_test locales; 3/3 pruebas backend, build web/admin y recorrido visual 1440/390 px aprobados. Pendientes inscripción por categoría, snapshots y revisión de pagos (etapa 4), además del despliegue en Neon. Ver [configuración de eventos](docs/event-configuration.md).
2026-09-25: etapa 2 en curso. Implementada la transición de eventos a Team (nuevos obligatorios; históricos opcionales), autorización por membresía, selección de Team y script de reporte/simulación/asignación. Migración 017 aplicada en invictus e invictus_test locales; cliente Prisma regenerado. Pruebas backend 3/3 y recorrido visual de eventos por Team a 1440/390 px aprobados. El reporte local encontró 2 eventos históricos sin Team; no se asignaron automáticamente ni se modificó producción. Detalle: [migración de eventos](docs/event-team-migration.md).
2026-09-25: Teams y membresías implementados y verificados con API y “Mis Teams”, roles locales, logo/contacto y gestión de miembros. Migración 016 aplicada a invictus e invictus_test locales; cliente Prisma generado. Build web/admin, 3 pruebas de integración y recorrido visual a 1440/390 px aprobados. Producción no modificada. Siguiente incremento: eventos por Team y migración de propiedad; ver [análisis](docs/teams-architecture.md) y [operación de Teams](docs/teams.md).
2026-09-24: el usuario confirma que Invictus está publicado en Vercel, Render, Neon y AWS S3. Despliegue reportado por el usuario; no verificado en esta revisión.

Etapa 1 completada localmente. Solo existía Invictus_Project_Kickoff.docx, conservado. Git inicializado en main. Paquetes seleccionados incorporados como workspaces locales portables; schema compuesto mediante compositor oficial, historial 001–013 conservado más migración propia 014.

## Decisiones
- 2026-09-25: el usuario confirma **una sola categoría por participante y evento**. Conservar la unicidad actual `(eventId, userId)` al extender la inscripción; la elección y sus snapshots se implementan en la etapa 4.
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

### Descubrimiento público y continuidad de sesión — acordado 2026-09-28

Estado: pendiente de implementación. Este incremento registra la conversación; no autoriza cambios de aplicación en esta actualización del backlog. El landing fue aprobado por el usuario. Conservar su dirección visual y la navegación Teams · Eventos · Deportistas · Tienda, sin prefijos «Mi» o «Mis».

Principio: explorar sin sesión; solicitar autenticación al participar. Separar las páginas públicas de la consola privada de cada Team. La visibilidad pública no concede membresía ni permisos de gestión.

- [x] **Catálogo público de Teams.** Implementado localmente el 2026-09-28: ruta /#/teams, búsqueda por nombre, tarjetas, paginación y endpoint anónimo con selección limitada de campos; conexión desde menú y landing. Build web, una prueba focalizada de privacidad y revisión visual escritorio/móvil con fixtures aprobados. Permitir búsqueda y consulta sin sesión de equipos activos que hayan habilitado su visibilidad. El enlace Teams de la navegación principal lleva siempre al catálogo público, incluso con sesión iniciada. Conservar en el menú del usuario el acceso a los equipos a los que pertenece. Reutilizar la configuración de visibilidad y modalidad de ingreso ya existente; no abrir las rutas privadas de gestión.
- [ ] **Ficha pública del Team.** Avance 2026-09-28: ficha básica accesible desde Ver Team, con nombre, logo, descripción y modalidad; equipos ocultos/inactivos excluidos también por URL. Pendientes portada, disciplinas, próximos eventos y acciones contextuales. Crear una página con portada, logo, nombre, descripción, disciplinas, próximos eventos publicados y modalidad de ingreso. Definir los campos de portada y disciplinas necesarios sin inventar datos. No exponer contactos privados, solicitudes, comunicados internos, cuentas de cobro ni listados de miembros por defecto. Los equipos ocultos tampoco deben ser consultables por URL pública directa.
- [ ] **Acciones según relación con el Team.** Ofrecer Unirse, Solicitar ingreso o Solo por invitación según su configuración. Pedir sesión para unirse, solicitar ingreso o crear un Team. Con sesión, mostrar Gestionar a OWNER/ADMIN y Entrar al equipo a MEMBER, respetando el estado activo y los permisos efectivos. Mantener la consola y el selector entre equipos como espacio privado.
- [ ] **Próximos eventos sin sesión.** Reutilizar el catálogo y detalle públicos existentes; presentar los próximos eventos publicados, su Team organizador, fecha, ubicación, categorías y precios. Solicitar sesión al inscribirse y mantener las reglas vigentes de cupo, elegibilidad y revisión. No duplicar el módulo de eventos ni publicar borradores.
- [ ] **Directorio y ficha pública de deportistas.** Sustituir la pantalla Próximamente por búsqueda y consulta de perfiles cuyo titular haya optado explícitamente por aparecer. Definir qué campos se comparten y permitir retirar la visibilidad. No hacer públicas automáticamente las cuentas, documentos, datos de contacto ni información de inscripción. Editar el perfil requiere sesión; interacciones sociales futuras quedan fuera de este incremento.
- [ ] **Retomar la intención después del acceso.** Conservar el destino y contexto al iniciar sesión o registrarse desde una acción de ingreso a Team, creación de Team o inscripción a evento. Regresar al equipo/evento y permitir completar la acción, sin ejecutar automáticamente una solicitud, inscripción o compra. Revalidar permisos y disponibilidad y aceptar solo destinos internos. Contemplar cancelación, sesión vencida y recursos que dejen de estar disponibles.
- [ ] **Tienda pública y momento de autenticación.** Conservar la consulta de productos, variantes y precios sin sesión. Definir en qué paso de la compra se solicita acceso antes de modificar carrito o checkout; el momento exacto sigue pendiente de decisión.
- [ ] **Verificación mínima del incremento.** Un recorrido anónimo por los catálogos y fichas, retorno tras autenticación y comprobaciones focalizadas de privacidad y permisos. Revisar escritorio y móvil en las pantallas afectadas; evitar repetir la batería completa sin una regresión que lo justifique.

Orden sugerido: catálogo y ficha de Teams → continuidad de sesión → presentación de próximos eventos → directorio de deportistas. Resolver el punto de acceso en compras antes de cambiar ese flujo.

### Trayectoria deportiva y credenciales — diseño funcional acordado 2026-10-02

Estado: **primera etapa externa implementada; evolución de verificación, badges y credenciales planificada**. Esta actualización es solo documentación/backlog; no autoriza cambios de código, Prisma, migraciones, endpoints ni UI. Mantener Información, Contacto, Presencia digital y Deportes existentes. Este apartado es la única lista de tareas de este incremento; no crea un segundo backlog. Releases orientativos, sin fechas comprometidas.

#### Propósito y conceptos

Trayectoria es el **CV deportivo progresivamente verificable** del participante. Debe servir a usuarios nuevos, amateurs, competitivos, experimentados y de élite: su historia no empieza al registrarse en Invictus. Reunir en una timeline participaciones Invictus e historia externa, distinguiendo lo declarado de lo respaldado.

- **Trayectoria:** vista cronológica agregada de la historia deportiva.
- **Resultado:** lo ocurrido en una prueba/competencia: tiempo o marca, posiciones general/de categoría, prueba y categoría, según la disciplina.
- **Badge:** representación visual de un reconocimiento; no almacena toda su información. Evolución visual hacia medalla digital con reconocimiento, evento, año, identidad Invictus y eventualmente identidad del evento.
- **Credencial:** registro verificable que respalda un resultado/reconocimiento oficial. El badge puede representarla visualmente, pero ambos conservan responsabilidades distintas.
- **QR:** mecanismo de acceso a la credencial, no la credencial ni un certificado por sí mismo.

**Inscripción ≠ participación acreditada ≠ resultado ≠ badge ≠ credencial.** No derivar Participante/Finisher de una inscripción aceptada, un pago confirmado o el estado COMPLETED sin definir qué hecho deportivo fue acreditado.

#### Dependencias reales y reutilización

- ParticipantProfile identifica el perfil; User identifica la cuenta. ParticipantDiscipline y el catálogo único Discipline permiten contexto/filtros, sin exigir que toda disciplina histórica siga en los deportes que practica actualmente.
- Event identifica el evento; Event.disciplineId vincula Discipline; Event.teamId vincula Team organizador. EventCategory y los snapshots de EventRegistration aportan categoría y datos históricos de inscripción; no asumir que representan ya la prueba/distancia o el resultado.
- EventRegistration relaciona Event, User y opcionalmente ParticipantProfile; RegistrationAudit registra decisiones de inscripción. La consulta actual de participaciones devuelve REGISTRATION_CONFIRMED: no acredita asistencia, Finisher ni posición.
- No existe actualmente un modelo específico de resultado deportivo, asistencia acreditada, badge o credencial deportiva. **PaymentResult es monetario**, no un resultado de competición. Definir el dominio de resultados antes de prometer generación oficial automática.
- EventRegistration ya contiene participationCode y participationQrDataUrl. Revisar su semántica al diseñar credenciales: no tratarlos como códigos de credencial ni reemplazar el flujo de inscripciones sin analizar compatibilidad. QR de credencial y eventual check-in son usos distintos.
- Reutilizar StoredFile, propiedad/privacidad y acceso autorizado para evidencias. Comprobantes de pago existentes no pasan a ser pruebas deportivas. Reutilizar Teams y roles como contexto, pero definir expresamente quién certifica resultados y revisa evidencia externa; pertenecer a un Team no basta para certificar.
- Reutilizar la tarea existente **Directorio y ficha pública de deportistas** para cualquier perfil público: no duplicarla. La verificación pública de una credencial es una superficie separada y no requiere publicar el perfil completo.

#### Principios arquitectónicos y confianza

Dos fuentes: **Invictus**, con datos relacionados del evento/participante y resultados acreditados cuando el dominio exista; **externa**, declarada por el deportista, con datos/evidencias propios. No duplicar evento, participante, disciplina, resultado y organizador en una tabla de trayectoria solo para mostrarlos; preferir relaciones y vistas agregadas. Identificar la fuente desde el MVP, evitar doble representación de una misma participación y reflejar correcciones oficiales en la timeline.

Estados conceptuales, con texto/icono y no solo color: **Declarado por el deportista** (información ingresada por el participante), **Evidencia verificada** (evidencia revisada/validada), **Validado por el organizador** (confirmación de datos deportivos por el responsable de ese evento), **Resultado oficial Invictus** (resultado originado en un evento gestionado directamente mediante Invictus). Son fuentes/orígenes de confianza diferentes, no necesariamente una jerarquía técnica lineal ni estados de pagos o inscripción. Su representación definitiva queda pendiente; pueden requerir distinguir procedencia, validaciones y estado de solicitud. Registrar quién verificó, cuándo, sobre qué evidencia y **qué comprobó**: participación, marca o posición. Una fotografía general del evento no valida automáticamente el resultado de una persona. Distinguir evidencia general del evento y evidencia específica del deportista/resultado.

El organizador (Team/club/organización) respalda el resultado según los permisos futuros; Invictus aporta infraestructura de registro, emisión y verificación. Mostrar ambos: **Organizado por** y **Emitido mediante Invictus**, sin presentar a Invictus como organizador de todo evento.

#### Release 1 — Trayectoria MVP

**Primera entrega implementada (2026-10-02):** historia externa con evento, Discipline y año obligatorios; fecha exacta opcional, detalles y enlace oficial. CRUD privado por titular, cronología por año, filtros y etiqueta «Declarado por el deportista». Modelo ExternalParticipation separado de Event y EventRegistration. Ver [docs/trajectory.md](docs/trajectory.md). No se exige completar trayectoria para registrarse o inscribirse.

- [x] Registrar, editar y eliminar participaciones externas propias.
- [x] Timeline externa por año y filtros por Discipline, incluyendo referencias históricas inactivas.
- [ ] Completar Release 1: evidencias mediante archivos, fuente oficial Invictus y timeline conjunta. Los puntos siguientes conservan el alcance completo del release.


Objetivo: una historia útil aun para alguien recién llegado a Invictus. Depende del perfil/Discipline existentes y de definir qué participaciones/resultados están realmente acreditados.

- [ ] **Definir modelo y contratos de trayectoria/resultado.** Separar hechos de inscripción, participación y resultado; definir prueba/distancia, categoría, unidades/precisión de marcas y posiciones según competencia. Relaciones/vistas para datos Invictus y almacenamiento propio para participaciones externas. No asumir nombres de modelos aún inexistentes.
- [x] **Registrar y mantener historia externa.** Edición/eliminación por titular. Campos según corresponda: evento, Discipline, fecha, lugar, prueba/distancia, categoría, posición, resultado/marca/tiempo, descripción opcional, organizador conocido y enlace oficial. Definir mínimos sin volver obligatorio todo el formulario; no crear otro catálogo deportivo.
- [ ] **Adjuntar evidencia básica.** Enlaces a resultados/publicaciones oficiales, documentos, certificados, actas y fotos. Separar sustento del evento de sustento de participación/resultado; acceso y validación de archivos con el sistema existente. Identificar estos datos como declarados hasta una revisión válida.
- [ ] **Integrar automáticamente la fuente Invictus.** Relacionar Event → EventRegistration → participación acreditada → resultado deportivo → trayectoria, cuando esas capacidades existan. Mostrar inscripciones solo con su significado real, nunca como resultados/Finisher. Evitar copia manual y actualizar la vista al corregirse el dato oficial.
- [ ] **Timeline conjunta por año.** Más reciente a más antiguo, con origen/confianza visible desde este release, estados vacíos y diseño responsive/accesible. Ejemplos ilustrativos: Natación · 50 m libre · 2.º · 32.41 s; Running · 21K · 01:48:32; evento histórico declarado. No confundir ejemplos con datos reales ni logros acreditados.
- [x] **Filtros por Discipline.** Todos y disciplinas presentes en la historia; preservar consulta de disciplinas históricas/inactivas. Reutilizar el catálogo existente.

Criterio de cierre: el usuario puede conservar historia previa y distinguir su procedencia; no se presenta como oficial ningún resultado aún no acreditado. La integración oficial queda condicionada al dominio de resultados, sin bloquear necesariamente el valor de la historia externa.

#### Release 2 — Confianza / verificación

Objetivo: hacer explícito qué datos están respaldados. Depende de evidencias y procedencia del Release 1.

- [ ] **Revisión simple de evidencia externa.** Definir autoridad revisora, permisos, solicitudes y motivos de aprobación/observación/rechazo, sin diseñar moderación excesiva. Registrar revisor, fecha, evidencia y alcance de lo verificado; revisores no validan automáticamente todos los campos por verificar un documento.
- [ ] **Estados de confianza y cambios posteriores.** Representar Declarado por el deportista, Evidencia verificada, Validado por el organizador y Resultado oficial Invictus con texto/icono y etiquetas claras, sin asumir una secuencia lineal. Separar el estado de la solicitud del respaldo vigente de los datos. Definir qué ediciones invalidan/requieren nueva revisión y cómo se impugna/corrige una verificación. Una revisión de evidencia externa no convierte el evento en gestionado por Invictus.

- [ ] **Validación por el organizador de una participación externa.** Etapa posterior a trayectoria externa, evidencias y representación de estados de confianza; fuera del MVP inicial y previa o coordinada con Release 4. El titular puede solicitar revisión al organizador identificado y autorizado sobre ese evento histórico. Flujo conceptual: deportista registra historia externa → Declarado por el deportista → solicita validación → organizador revisa → confirma (Validado por el organizador), rechaza (solicitud rechazada) o indica datos incorrectos mediante observaciones para corregir y volver a revisar. Rechazar una solicitud no elimina silenciosamente la participación ni la convierte en un resultado oficial. Ejemplo: Carrera 10K Callao 2024, 42:15, 3.º puesto, categoría 40–49; tras confirmación mostrar «✓ Validado por el organizador · Club Atlético Callao · 12 oct 2026». Ejemplo ilustrativo, no datos reales.
  - **Autoridad acotada al evento:** validar únicamente participación, Discipline, prueba/distancia, categoría, posición y resultado/marca/tiempo correspondientes. No concede edición libre del perfil ni autoridad sobre nombre, documento, teléfono, dirección, bio, redes sociales, otros eventos o información ajena. Reutilizar identidad/cuenta y Teams cuando corresponda, pero verificar el vínculo evento–organizador y el permiso certificador específico; membresía, nombre de organizador en texto libre o similitud del nombre del evento no prueban autoridad. Definir posteriormente cómo identificar y vincular el evento externo con su responsable, sin exigir convertirlo en un Event gestionado por Invictus.
  - **Trazabilidad de la solicitud y decisión:** conservar evento/participación, campos y valores o versión realmente validados, persona que valida, organización responsable, fecha, estado de solicitud, observaciones y evidencia asociada cuando exista. No reducirlo a verified = true. Aplicar la tarea existente de cambios posteriores para invalidar o revisar respaldos cuando cambien los datos confirmados; preservar historial de decisiones.
  - **Fuentes distintas:** evento externo/histórico con validación posterior del organizador sigue siendo externo; no equivale a evento gestionado directamente en Invictus con resultado oficial generado en la plataforma.

**Oportunidad de producto, sin compromiso:** una solicitud de validación de historia externa puede acercar a organizadores que aún no gestionan eventos con Invictus: deportista registra carrera histórica → solicita validación → organizador conoce/revisa la solicitud en Invictus → podría gestionar eventos futuros en la plataforma. No compromete invitaciones, notificaciones, captación ni automatizaciones en esta entrega.

Criterio de cierre: cada validación tiene responsable y alcance; cambios en datos verificados no mantienen confianza obsoleta silenciosamente.

#### Release 3 — Badges / medallas digitales

Objetivo: reconocimientos objetivos provenientes principalmente de eventos Invictus; dependen de participación/resultados acreditados, no solo de inscripción.

- [ ] **Modelo de reconocimiento y reglas.** Relacionar badge con resultado/evento/participante y emisor. Generación idempotente por hechos acreditados y reglas del evento, evitando reconocimientos duplicados o arbitrarios.
- [ ] **Participante y Finisher.** Definir evidencia objetiva de participación y finalización. No otorgarlos automáticamente por CONFIRMED/COMPLETED sin el respaldo deportivo correspondiente.
- [ ] **Podios y campeón de categoría.** Primer, segundo y tercer puesto, y campeón cuando aplique. Especificar si la posición es general o de categoría y el tratamiento de empates, descalificaciones y correcciones antes de generar badges.
- [ ] **Medalla digital.** Diseño con reconocimiento, evento/año e identidad visual; separar presentación de los datos verificables. Accesibilidad y estado vigente/revocado textual.

Dependencia entre releases: en Release 3 el badge queda respaldado por el **resultado oficial**; Release 4 añade credencial verificable y vínculo Badge ↔ Credencial. No afirmar que hay credenciales o QR verificables antes de implementarlos. Revisar/corregir reconocimientos derivados si cambia el resultado.

#### Release 4 — Credenciales deportivas verificables

Objetivo: verificar y compartir un reconocimiento sin publicar todo el perfil. Depende de resultados/reglas oficiales y decisiones de publicación.

- [ ] **Modelo y emisión de credencial.** Relación clara con resultado oficial/reconocimiento. Mostrar datos permitidos: deportista/username, evento, Discipline, prueba/distancia, categoría, resultado/marca/tiempo, posiciones general/de categoría, reconocimiento, fecha/lugar del evento, organizador, emisor, fecha de emisión, identificador único y estado. Definir contenido mínimo y permisos de emisión. Evaluar participaciones externas **Validadas por el organizador** como candidatas, condicionado a la validación y trazabilidad del Release 2; no toda confirmación genera automáticamente una credencial. Reglas de elegibilidad/emisión y relación con esa validación quedan pendientes, preservando la distinción frente al resultado oficial Invictus. No duplicar datos solo para renderizar, y evaluar versiones/snapshots cuando sean necesarios para auditoría.
- [ ] **Código y página pública de verificación.** Acceso sin sesión por código único; formato de ruta pendiente (/v/{verificationCode} es solo conceptual). Evitar códigos predecibles/enumerables. Reutilizar serializers públicos explícitos; no divulgar documentos, contacto privado ni historial completo. Definir publicación/consentimiento y retirada de datos sin romper el registro de revocación.
- [ ] **QR de URL permanente Invictus.** Apunta a la página de verificación, nunca directamente a PDF, imagen, archivo S3 ni resultado estático. Estabilidad del código/URL ante correcciones; diseño/exportación sin fijar aún proveedor o librería.
- [ ] **Sustentos públicos/privados.** Evidencias oficiales, actas, documentos, fotos y enlaces; distinguir evento y resultado individual. Definir qué se muestra públicamente, redactar datos sensibles y conservar acceso autorizado a archivos privados.
- [ ] **Correcciones y auditoría obligatorias.** Versionar cambios, actor, fecha y motivo; ejemplo 47:35 → 47:32. La credencial y trayectoria muestran resultado vigente sin cambiar QR; actualizar los reconocimientos derivados coherentemente. No dejar la trazabilidad condicionada a conveniencia técnica.
- [ ] **Revocación/invalidez y consulta permanente.** Conceptos válida, corregida y revocada/inválida; definir transición y relación entre validez y revisión. La URL no desaparece silenciosamente y muestra la revocación con claridad para que un QR antiguo no aparente vigencia.
- [ ] **Badges destacados.** Selección por el titular para Tu identidad y, cuando exista, su perfil público. Resumen compacto, no toda la timeline. Cantidad, orden y tratamiento de badges corregidos/revocados pendientes de UX.
- [ ] **Compartir credencial.** Inicialmente enlace y QR independientes del perfil completo. Imagen compartible, PDF/certificado, LinkedIn y otras redes solo como evaluación posterior, sin compromiso de integraciones.

#### Decisiones pendientes, conflictos y verificación futura

- Pendientes: modelo de prueba/resultado y participación acreditada; autoridad del organizador/revisor externo y vínculo verificable con el evento histórico; representación no lineal de fuentes de confianza y estados de solicitud; elegibilidad de participaciones validadas para credenciales; formatos de marca/unidades; reglas de premios/empates; mínimos del formulario externo; prevención de duplicados entre fuentes; visibilidad/consentimiento; formato de código/ruta; número de badges destacados; necesidad de snapshots de emisión.
- Conflicto de alcance resuelto: resultados/cronometraje/certificados siguen fuera del **piloto vigente** y de esta tarea documental. Estos releases son futuro planificado; no modifican las exclusiones históricas ni marcan como implementadas funciones de resultados. El QR de credencial no incorpora check-in.
- Reutilización: perfil existente, Deportes/Discipline, Teams/EventCategory, inscripción y auditoría, archivos y la tarea ya existente de perfil público. No se crean tareas paralelas para reconstruirlos.
- Verificación futura proporcional: casos agrupados de procedencia, propiedad, conservación de datos, evidencia/alcance, correcciones, reglas de badges, emisión idempotente, privacidad y QR/revocación estable; un recorrido visual puntual por release. Mantener la preferencia de pruebas mínimas sin omitir integridad ni autorización.
- Primera etapa externa implementada; la integración con resultados oficiales y las siguientes releases permanecen pendientes.

### Teams y primer evento real — plan pendiente

Registrado el 2026-09-24. El estado de cada etapa se indica abajo. Priorizar cambios pequeños y reutilizar los módulos existentes; pruebas mínimas solicitadas por el usuario el 2026-09-25, manteniendo las necesarias para permisos e integridad.

#### Etapa 0 — análisis y decisiones previas
- [x] Completar el análisis de User, Event, autenticación, permisos, archivos, almacenamiento, frontend y admin. Revisión estática del 2026-09-25 documentada en [docs/teams-architecture.md](docs/teams-architecture.md), con modelos, relaciones, migraciones, pantallas y riesgos. Datos/despliegue reales no verificados.
- [ ] Revisar `Event.organizerId`, los eventos personales EXTERNAL y su revisión por Invictus. Definir los permisos de moderación del ADMIN global frente a los roles del Team; propuesta inicial: conservar la aprobación de eventos externos.
- [x] Evaluar reutilización de EventRegistration, EventRegistrationConfig, PaymentRecipient, RecipientMember, PaymentOperation, ManualPayment, PaymentResult y StoredFile. Análisis del 2026-09-25: mantener coordinador/operaciones/intentos; ampliar autorización por Team, tipos de pago y snapshots. Transferencias y observaciones todavía no están soportadas. RecipientMember permanece distinto de TeamMember.
- [x] Definir cardinalidad: una categoría por participante/evento, confirmada por el usuario el 2026-09-25; conservar unicidad por evento y usuario.
- [x] Edad cumplida el día del evento (confirmada); validar elegibilidad en servidor. Pendientes/observadas conservan cupo; rechazo lo libera sin reinscripción. Cupo y categoría se mantienen inmutables tras recibir inscripciones.
- [x] Conservar estados históricos y confirmación automática en eventos sin categorías. Nuevas categorías usan PENDING_REVIEW → CONFIRMED/OBSERVED/REJECTED; OBSERVED permite corrección. Revisión manual de gratuitas adoptada como supuesto comunicado.

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
- [x] Crear catálogo general Discipline y asociarlo a Event; catálogo inicial con natación, running, ciclismo, triatlón y trekking; disciplina opcional para compatibilidad, obligatoria para publicar eventos con categorías.
- [x] Crear EventCategory propia de cada evento: nombre, descripción, restricciones opcionales de género, edad y modalidad; precio en unidades menores, cupo opcional, estado y timestamps. API y formulario en “Categorías y pagos”; editable solo en borradores sin inscripciones. La elegibilidad y reserva real por categoría quedan en etapa 4.
- [x] Configurar métodos de pago del Team: múltiples Yape, Plin, transferencias y efectivo, incluso del mismo tipo. OWNER configura; ADMIN consulta y selecciona en eventos. Campos según tipo, PEN/USD, Yape/Plin solo PEN, QR privado con autorización por Team y protección frente a borrado.
- [x] Seleccionar métodos por evento sin duplicar configuración. API y claves foráneas compuestas impiden asociar cuentas de otro Team. Solo métodos activos; publicación exige moneda compatible con las categorías de pago. Desactivación en lugar de borrado.
- [x] Conservar importe, moneda e instrucciones históricas en la inscripción/operación reutilizando los snapshots existentes; cambios posteriores de categoría o cuenta no deben alterar operaciones anteriores.

Evidencia de configuración etapa 3 (2026-09-25): `node --env-file=.env --test tests/event-setup.test.js tests/integration.test.js` 3/3, `npm run build` y `node --env-file=.env scripts/check-event-setup-ui.js` aprobados. Capturas `event-setup-desktop.png` y `event-setup-mobile.png` inspeccionadas, sin overflow horizontal. Prisma y escritura de archivos/capturas requirieron permisos fuera del sandbox por EPERM; selectores de la prueba visual ajustados al formulario. Los eventos con categorías aún no admiten inscripción; conservan visible su configuración pública y aviso de próxima apertura. Eventos anteriores sin categorías conservan flujo gratuito.

#### Etapa 4 — inscripción y revisión manual
- [x] Extender la inscripción existente: categoría, precio, datos requeridos, método habilitado y comprobante cuando corresponda; efectivo con comprobante opcional. Validar en backend categoría/evento/Team/método y calcular el importe en servidor.
- [x] Reutilizar archivos privados y almacenamiento local/S3 para comprobantes. Autorizar lectura al participante propietario y a OWNER/ADMIN del Team organizador, con acceso temporal y sin URL pública permanente; impedir acceso a otros participantes y miembros sin permisos.
- [x] Implementar el flujo propuesto pending → accepted/observed/rejected y observed → pending tras corrección/reenvío, con motivo de observación. Resolver el mapeo/migración de estados existentes antes de cambiar contratos compartidos con pagos, perfiles u otras funciones.
- [x] Registrar revisión, usuario revisor, fechas y cambios de estado con auditoría básica. Coordinar resultado de pago e inscripción sin crear dos decisiones contradictorias.
- [x] Crear administración de inscripciones por evento: búsqueda, filtros por categoría/estado, participante, método, comprobante, aceptar/observar/rechazar y resumen de cantidades/cupos.
- [x] Adaptar “Mis inscripciones”: evento, Team, categoría, importe, método, estado y observación; permitir corregir y reenviar las observadas.

Evidencia etapa 4 (2026-09-26): backend 4/4, build web/admin y scripts/check-category-registration-ui.js aprobados. Capturas inspeccionadas a 390/1440 px. Edad al día del evento confirmada por el usuario. Revisión de gratuitas por Team adoptada como supuesto comunicado; las observadas conservan cupo y las rechazadas son terminales. Ver docs/category-registrations.md. Prueba manual del usuario y despliegue pendientes.

#### Etapa 5 — validación del piloto y regresiones
- [x] Probar aislamiento entre dos Teams, usuarios con distintos roles por Team, revocación de membresía, acceso directo por ID y privacidad de comprobantes.
- [x] Probar último OWNER concurrente, último cupo, duplicados/reenvíos, cambios de precio/método e historial de revisión.
- [x] Verificar migración con eventos e inscripciones existentes, publicación/revisión de eventos, tienda, productos, pedidos, pagos y perfiles. Validar frontend y admin con un recorrido completo del piloto.

Evidencia etapa 5 (2026-09-26): validación técnica local mínima completada. Una sola ejecución adicional, tests/pilot-validation.test.js, 1/1 aprobada: roles cruzados entre Teams, cupo global concurrente entre categorías, rechazo que libera cupo y precio inmutable tras inscripción. Se reutilizan pruebas backend, migraciones locales, build y recorrido visual de etapas anteriores; no se repite la batería ni se cambia código de aplicación. Ver [cierre mínimo](docs/pilot-validation.md). Pendientes operativos: prueba manual, despliegue/Neon/S3 y mapa de eventos históricos.

Fuera del alcance nuevo: pasarela o API de Yape/Plin, validación automática de pagos, cronometraje, resultados, rankings, certificados, dorsales, check-in QR, invitaciones complejas, chat, permisos por módulos y notificaciones avanzadas. No retirar funciones existentes relacionadas sin revisar compatibilidad. El dashboard global continúa como tarea independiente; el piloto solo requiere resúmenes operativos sencillos.

## Bloqueos
Mis Teams visual (2026-09-29): directorio navy con Perteneces/Explorar, Crear Team dorado y cards horizontales con bannerFileId a la izquierda, logo independiente, rol y acción según membresía. Conteos reales de miembros/eventos publicados; resultados sin dato (—). Móvil apila el banner sobre la card. Invitaciones, búsqueda, solicitudes, paginación y formulario conservados. npm run build:web y sintaxis de server/teams/service.js aprobados. Recorrido con fixtures: banner separado, Gestionar, pestañas, modal Crear Team y 390 px sin overflow; capturas team-directory-desktop/mobile inspeccionadas. No se modificaron equipos reales.

Pedidos visual (2026-09-29): vista de usuario navy con descripción, panel Tus pedidos/contador, fecha con icono, código destacado, estado por color/texto y Ver detalle con flecha. Cards en móvil; detalle/pagos existentes reutilizados y gestión administrativa conservada. npm run build (web/admin) aprobado. Recorrido mínimo con fixtures: listado, menú activo, abrir/cerrar detalle y móvil 390 sin overflow; capturas orders-desktop.png/orders-mobile.png inspeccionadas. Sin cambios a datos ni reglas de pagos; revisión manual pendiente.

Inscripciones visual (2026-09-29): vista navy sin hero, panel con contador, tabla de escritorio/cards móvil, imagen y ubicación reales del evento cuando existen, fecha con icono, estados legibles y aviso informativo. Historial amplía selección con status/venue/primaryImageFileId; Ver evento solo para ficha publicada con slug. Conservadas acciones Ver inscripción/Corregir inscripción y modal. npm run build:web y node --check server/services.js aprobados. Recorrido mínimo con fixtures: enlace, menú activo, apertura de corrección, móvil 390 sin overflow; capturas registrations-desktop.png y registrations-mobile.png inspeccionadas. Sin escrituras sobre inscripciones reales; revisión manual pendiente.

Perfil y menú (2026-09-29): rediseño navy con teamsHero.png existente, identidad/foto a la izquierda, formulario a la derecha, botón de cámara, vista previa de texto, iconos y contador de biografía (conserva 2000 caracteres). Menú con iconos lineales y opción activa dorada; permisos, privacidad y contrato de guardado conservados. Build web/admin aprobado y recorrido mínimo con respuestas simuladas: edición, guardado privado, menú/Escape y móvil 390 sin overflow. Capturas profile-desktop.png/profile-mobile.png inspeccionadas; ajustes finales de contraste y encuadre aplicados. No se modificaron datos reales; prueba manual de guardado/foto pendiente.

Fix de transferencias (2026-09-29): sendFileStream distingue cierre del cliente de errores del origen antes de la limpieza de pipeline. Cancelaciones HTTP esperadas no propagan ERR_STREAM_PREMATURE_CLOSE/ECONNRESET; fallos reales de lectura y cierres prematuros del origen siguen notificándose. Aplicado a archivos públicos/privados, QR y comprobantes. Pruebas mínimas: tests/file-stream.test.js 3/3 aprobadas (incluye cancelación HTTP real local); sintaxis de los cinco archivos modificados aprobada.

Login y registro (2026-09-28): rediseño con sistema visual navy/dorado, imagen deportiva existente, formulario oscuro y layout responsive. Componente separado en Login.jsx, compartido con administración; endpoints, validación y redirecciones conservados. Mostrar/ocultar contraseña, controles bloqueados durante envío y errores reiniciados al cambiar de modo. npm run build (web/admin) aprobado. Revisión visual de capturas auth-login-desktop.png y auth-register-mobile.png en .local/screenshots: escritorio 1440 y móvil 390 sin overflow; interacción comprobada con respuestas simuladas, sin crear cuentas ni repetir pruebas backend. Validación manual de acceso real pendiente.

Buscador y deportes de Teams (2026-09-28): implementados buscador ancho al pie del hero, selección múltiple del catálogo Discipline en el formulario, filtro por deporte y órdenes A–Z (predeterminado), Z–A, recientes y más miembros. Conteo público agregado, sin datos de miembros. Migración 20260928022_team_sports aplicada en invictus e invictus_test locales y cliente generado. Prisma validate, sintaxis backend, npm run build:web y tests/public-teams.test.js (3/3) aprobados; comprobados persistencia/retiro de deportes, permisos, órdenes y filtro combinado con paginación. Sin ubicación. Revisión visual manual pendiente; se mantiene la petición de pruebas mínimas.

Banner de cards de Teams (2026-09-28): implementados formulario opcional con vista previa/reemplazo/retiro, referencia independiente del logo, validación de archivo público propio JPG/PNG/WebP hasta 10 MB y cards con logo circular sobrepuesto usando el sistema visual existente. Hero teamsHero.png y búsqueda por nombre conservados; sin filtros nuevos. Migración 20260928021_team_banner aplicada en invictus e invictus_test locales y cliente Prisma generado. Verificación mínima aprobada: Prisma validate, sintaxis de backend, npm run build:web y tests/public-teams.test.js (2/2: privacidad y ciclo del banner, formatos, propiedad y límite de 10 MB). No se amplía la batería por petición del usuario; revisión visual manual pendiente. El límite compartido de uploads ahora es 10 MB y se impide borrar banners asociados.

Antecedente local (2026-09-23): el navegador integrado no arrancó por un fallo del sandbox; la prueba visual alternativa con Edge oculto sí pasó y guardó capturas en .local/screenshots.
2026-09-24: acceso por terminal de Codex restablecido tras corregir el propietario de .git. Navegador integrado pendiente de volver a comprobar.
## Evidencia local — incremento backend
2026-09-23: ambas conexiones verificadas sin divulgar secretos. Las bases confirmadas estaban vacías; se aplicaron 14 migraciones a invictus e invictus_test. Cliente único Prisma 6.19.0 generado.
`npm run test:integration`: 1/1 aprobada. Cookies reales, PostgreSQL, roles, evento publicado, inscripción gratuita confirmada y perfil, último cupo, última unidad, checkout idempotente, pago manual verificado, rechazo de cancelación pagada, cancelación repetida con stock restituido una vez, cotización y archivos privados. No hay identidad HTTP simulada; roles de fixtures provisionados directamente en la base de prueba.
Frontend implementado. `npm run build` compila web y admin. Prueba visual alternativa aprobada: registro/login, evento, producto, inscripción/perfil, carrito/pedido/pago y responsive 390/1440; capturas en .local/screenshots. Paleta oficial incorporada y referencia preservada en docs/brand.


Perfil del deportista etapa 1 (2026-10-01): Información/Contacto funcionales con guardados independientes, borradores entre pestañas y estados vacíos en Presencia digital/Deportes/Trayectoria. Nombres del perfil como fuente de verdad; proyección temporal en User para compatibilidad con Teams/admin/inscripciones. location histórico preservado sin inferir UBIGEO. Catálogo local de 1892 distritos, teléfono E.164 y banner/avatar con files existente. Migración 20261001024_athlete_profile aplicada en invictus e invictus_test locales; Prisma validado/generado. Pruebas mínimas: tanda de 14/14 aprobadas, casos de perfil e integración antigua repetidos solo tras ajustes puntuales aprobados; build web/admin y E2E real 1440/390 sin overflow aprobados. Capturas inspeccionadas. Ver docs/athlete-profile.md. Pendientes: prueba manual del usuario, despliegue de migración y siguientes tres etapas; S3 reutilizado sin prueba de producción.

## Ajustes acordados de navegación pública — 2026-10-03

Catálogo único, buscador fuera del hero, Mis eventos solo en menú de cuenta, creación con continuidad de acceso/perfil, rutas públicas History API y acciones con iconos/tooltips. Sin migraciones. Detalles y requisito de hosting en docs/public-navigation.md.

## Editor personal de eventos — 2026-10-03

Página de tres pasos, preview de imagen/QR, borrador mínimo, categorías/precios, Yape/Plin y revisión/publicación. Migraciones locales 032–033 sin pérdida de datos. Un recorrido funcional aprobado; revisión visual a cargo del usuario. Detalle: docs/event-editor.md.

## Reglas de ciclo de vida personal — 2026-10-03

Bloqueo de despublicación con inscritos y de publicación/despublicación desde el inicio; condiciones históricas congeladas, contenido y gestión de inscritos disponibles. Etiquetas de historial sin nuevos estados. Ediciones parciales conservan fecha. Un test dirigido aprobado; detalle docs/personal-event-lifecycle.md.

### 2026-10-05 · Logística opcional de eventos
- Completado formulario, backend y detalle: concentración, kits y ruta; cupo movido al paso 2 y revisión con enlaces a editar.
- Reutilizados Event, startsAt, StoredFile, ImagePicker, endpoints, validación de propiedad y transacciones existentes; sin tablas nuevas.
- Migración aditiva 034 aplicada en ambas bases locales. Pendiente desplegarla en otros entornos.
- Dos pruebas integrales dirigidas aprobadas y build web/admin aprobado. Visuales a cargo del usuario. Detalles en docs/event-logistics.md.

- Precisión de horarios: fecha única, ubicación compartida, concentración sin required ni etiqueta opcional y salida; sin migración adicional. Prueba dirigida cubre concentración vacía, día distinto y hora posterior.

- Kits: fechas desde/hasta, horario diario desde/hasta, lugar único e instrucciones; más espacio bajo casilla. Migración aditiva 035 con traslado de datos aplicada en ambas bases locales. Prueba integral dirigida y build web aprobados.
