# Módulo 8: perfil y trayectoria del participante

Parte 4: [adaptadores, contratos de uso y límites de integración](../../docs/adaptadores-integracion.md). Los nuevos flujos de cobro requieren cerrar la parte 5 antes de habilitarse.

**Paso 3:** entrada raíz `@base/perfil-trayectoria`, versión y dependencias explícitas. Se validan textos/enlaces/decisiones; archivos requieren adaptador y HIDE no se revierte desde edición PUBLIC del propietario. `canModerate` permite autorización del host. Ver [uso y compatibilidad](../../docs/modulos-independientes.md).

**Actualización 22/09/2026:** disponible `createPrismaProfileStore` en `src/prisma-store.js`/`src/index.js`, con servicio compatible con lecturas asincrónicas. Usar la [composición y migraciones vigentes](../../docs/persistencia-prisma.md): UUID y tabla `users` correctos, no el SQL suelto histórico indicado más abajo. Persistencia verificada con PostgreSQL 15 aislado; archivos/participaciones integrados y política de republicación aún pendientes.

## Propósito y límites

Perfil genérico para participantes de eventos deportivos, teatrales, musicales, académicos, culturales o similares. Incluye edición privada, perfil público opt-in, foto/documentos referenciados al módulo 2, disciplinas, trayectoria, logros, enlace público y moderación. No implementa rankings, puntuaciones, resultados automáticos, QR de asistencia, diplomas, redes, mensajería ni recomendaciones.

## Origen y reutilización

Construcción nueva sobre contratos de módulos 1, 2, 6 y 7. Reutiliza identidad/roles del módulo 1, `assertOwned` y `fileId` del módulo 2, permisos del módulo 3 y la asociación nullable `profileId` del módulo 7. No se modificaron proyectos de origen ni se copiaron secretos o datos productivos.

## Dependencias

Obligatoria: Node 22+, Express, identidad del módulo 1 y un repositorio persistente. Obligatoria para archivos: módulo 2. Opcionales: módulo 6 para eventos, módulo 7 para participaciones y módulo 3 para montar la revisión administrativa. La demo usa store en memoria únicamente.

## Modelo y migración

`participant_profiles` tiene un perfil por usuario, textos públicos, ubicación opcional, disciplinas JSONB, experiencia, logros, `avatar_file_id`, `document_file_ids`, enlace, visibilidad y estado de moderación. Aplicar `prisma/migration.sql` después de usuarios; en una aplicación con nombres de tabla distintos, adaptar solo la FK. No duplica eventos ni inscripciones.

## Permisos, privacidad e integración

El servidor exige sesión para leer/editar `/me`; el propietario solo puede modificar su perfil. `/public/:id` responde únicamente con `PUBLIC` y omite `userId` y documentos. Cada archivo se valida con `fileService.assertOwned`; el módulo no expone bytes ni sustituye las políticas del módulo 2. ADMIN/SUPERADMIN puede moderar según la concesión del anfitrión.

La integración con módulo 7 es opcional y debe inyectar `listForProfile`. La demo y el contrato distinguen `REGISTRATION_CONFIRMED`; no se convierte en asistencia ni resultado. El punto futuro consiste en que el organizador/superadmin escriba verificaciones explícitas (`ATTENDANCE_VERIFIED`, `RESULT_VALIDATED`, `ACHIEVEMENT_VERIFIED`) en el módulo de participaciones, nunca en inferirlas desde la inscripción.

## Incorporación

Instalar el paquete, aplicar la migración, montar `createProfileRouter({service,getUser})` en `/api/profiles`, inyectar el repositorio persistente, `fileService.assertOwned` y opcionalmente un adaptador de módulo 7. Conectar la pantalla privada al usuario autenticado y el panel administrativo a la concesión real del servidor. `npm run dev:profiles` inicia la demo en `http://127.0.0.1:3220`.

## Pruebas ejecutadas

`npm run test:profiles`: 6 pruebas mínimas aprobadas: crear/actualizar, aislamiento entre usuarios, perfil privado, inscripción confirmada sin resultado, archivos mediante `assertOwned` y moderación administrativa. No se ejecutaron suites completas, PostgreSQL, navegador ni almacenamiento externo.
