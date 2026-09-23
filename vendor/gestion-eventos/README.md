# Módulo 6: gestión genérica de eventos

Parte 4: [adaptadores, contratos de uso y límites de integración](../../docs/adaptadores-integracion.md). Los nuevos flujos de cobro requieren cerrar la parte 5 antes de habilitarse.

**Paso 3:** paquete importable por `@base/gestion-eventos`, fecha/zona/URL validadas y errores HTTP comunes (`legacyErrors` opcional). Asignar imágenes requiere `fileService.assertOwned`; la demo básica ya no incluye IDs de imágenes sin adaptador. Ver [uso y compatibilidad](../../docs/modulos-independientes.md).

**Actualización 22/09/2026:** disponible `createPrismaEventStore` en `src/prisma-store.js`/`src/index.js`. Usar la [composición y migraciones vigentes](../../docs/persistencia-prisma.md), no el SQL suelto histórico indicado más abajo. Persistencia, beneficios y FK simples verificados con PostgreSQL 15 aislado. La demo conserva memoria; validación de archivos y configuración de inscripción siguen pendientes.

## Propósito y límites

Gestiona eventos independientes de tiendas, productos, carritos, deportes e inscripciones: borrador, publicación, propietario organizador, datos de fecha/zona horaria/ubicación, estado, enlace público único, QR, imágenes referenciadas y beneficios configurables. No incluye inscripciones, cupos, pagos, comprobantes, asistencia, resultados, perfiles deportivos ni códigos QR individuales.

Origen y reutilización: adaptación propia basada en los contratos locales de usuarios/acceso, archivos/imágenes y panel administrativo de esta biblioteca. No se modificaron proyectos de origen ni se copiaron secretos, datos o recursos de producción.

## Dependencias, modelo y migración

Obligatoria: Node 22+, Express, identidad del módulo 1 y un store/adaptador persistente. `qrcode` genera el QR localmente. Opcionales: módulo 2 para las referencias `primaryImageFileId`, `bannerImageFileId`, `galleryFileIds` y beneficios; módulo 3 para el panel. `prisma/migration.sql` crea `events` y `event_benefits`, con `organizer_id` enlazable a `users.id`, estados `DRAFT|PUBLISHED|CLOSED|FINISHED|CANCELLED`, slug único, fecha UTC, zona horaria y referencias de archivos.

## Estados, permisos y QR

Solo propietario o `SUPERADMIN` puede consultar/gestionar. Los publicados pueden editarse; `CLOSED`, `FINISHED` y `CANCELLED` quedan bloqueados. Publicar exige fecha y zona horaria. El enlace tiene formato `${PUBLIC_BASE_URL}/eventos/<slug>` y el QR se genera desde ese enlace al consultar la página pública. No contiene identidad ni datos de participantes.

## Integración futura e incorporación

El módulo 7 puede relacionar `event_id` con inscripciones/cupos/pagos y generar sus propios QR sin cambiar estas reglas; debe usar `PUBLISHED` como prerrequisito y respetar `organizer_id`. Para incorporar: agregar al workspace, ejecutar `npm install`, aplicar la migración después de usuarios/archivos, inyectar repositorio, sesión y `PUBLIC_BASE_URL`, y montar `createEventRouter({ service, getUser })` bajo `/api/events`. No copiar la base demo.

## Ejecución y pruebas

`npm run dev:events` inicia el ejemplo en `http://127.0.0.1:3200`; usa evento y referencias ficticias. `npm run test:events` ejecuta 4/4 pruebas mínimas. No se ejecutaron suites completas, PostgreSQL ni navegador; la carga real de archivos se verifica mediante el módulo 2.
