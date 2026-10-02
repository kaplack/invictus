# Perfil del deportista — etapa 1

Implementado sobre el perfil existente, conservando el sistema visual navy, navbar, footer y registro mínimo. No hay rutas de perfil público nuevas ni bloqueos por perfil incompleto.

## Interfaz y contratos

`/perfil` (también `/cuenta`) mantiene banner y tarjeta de identidad. Información y Contacto tienen formularios y guardados independientes; cambiar de pestaña conserva los borradores. Presencia digital, Deportes y Trayectoria tienen estados vacíos, sin funciones ficticias. Tabs accesibles con flechas, Home/End y desplazamiento horizontal interno en móvil.

Información: nombres, apellidos, username, fecha de nacimiento, género, documento, avatar y bio. Contacto: teléfono internacional, país y ubicación. La tarjeta solo muestra nombres, @username, avatar, bio y ubicación resumida como previsualización privada del propietario.

- GET /api/profile: requiere sesión, devuelve el perfil privado del propietario o null si aún no existe.
- PUT /api/profile: actualización parcial compatible con el contrato anterior. Los campos omitidos se conservan; campos nuevos anulables aceptan null. Documento y número se validan juntos. Username es obligatorio en registro y no se puede borrar desde el perfil.
- GET /api/profile/username-availability: requiere sesión y acepta el username propio. Reutiliza el validador del registro; minúsculas, 3–30 caracteres a–z/0–9/punto/guion bajo. Debounce de 450 ms, descarte de respuestas anteriores, reintento, validación final en servidor y UNIQUE en PostgreSQL.
- GET /api/profile/location-catalog: requiere sesión; devuelve países y catálogo UBIGEO. El país usa ISO 3166-1 alpha-2. Para Perú, departamento/provincia/distrito dependen del catálogo; fuera de Perú se admiten divisiones administrativas textuales.

Al guardar Información se actualiza la identidad de la sesión que consume el header. Login sigue usando email/password y las sesiones se siguen resolviendo por UUID. No se modifica el flujo de registro.

## Estructura final de datos

**User** mantiene id, username, email, passwordHash, role, status, createdAt, updatedAt y sus relaciones técnicas existentes. Esta etapa no añade columnas a User. name y lastName permanecen temporalmente como proyección de compatibilidad; aún los consumen autenticación, Teams, administración, búsqueda y snapshots de inscripciones.

**ParticipantProfile** incorpora:
- name y lastName anulables;
- dateOfBirth como DATE, sin edad almacenada;
- gender como enum ProfileGender (MALE, FEMALE, NON_BINARY, SELF_DESCRIBED, PREFER_NOT_TO_SAY);
- documentType como enum IdentityDocumentType (DNI, FOREIGN_RESIDENT_CARD, PASSPORT), documentNumber anulable; DNI de ocho dígitos y validación flexible para otros documentos;
- phone anulable en E.164, por ejemplo +51980784509;
- countryCode, department, province, district y ubigeoCode anulables;
- bannerFileId y relación banner a StoredFile.

Conserva id, userId único, publicName, bio, location, avatarFileId/avatar, disciplines, experience, achievements, documentFileIds, publicLink, visibility, moderationStatus y timestamps. Los campos deportivos y enlaces históricos ya existían: se preservan, sin añadir edición ni modelos nuevos en esta etapa.

**StoredFile** añade solo la relación inversa ProfileBanner; conserva su almacenamiento y metadatos.

### Transición de nombres

Migración nueva `20261001024_athlete_profile`: copia los nombres conocidos de User a perfiles existentes sin inferir datos desde publicName. Mantiene los nombres de User y todos los datos históricos. Para usuarios históricos sin perfil, el primer guardado recupera sus nombres de User. La inscripción gratuita antigua reutiliza ahora el mismo servicio para crear un perfil, conservando ese comportamiento automático y la copia de nombres. No obliga al registro a crear un perfil.

ParticipantProfile es la fuente de verdad para las ediciones nuevas. Al guardar nombres/apellidos/username, una transacción sincroniza la proyección User.name/lastName y recalcula publicName (o @username cuando no hay nombres). Elimina el riesgo de escrituras parciales entre cuenta y perfil. Las inscripciones ya realizadas conservan sus snapshots históricos.

Esta duplicación es transitoria: retirar User.name/lastName requiere cambiar explícitamente los consumidores enumerados y sus consultas, antes de una futura migración de eliminación. No se realizó ese refactor transversal ahora.

### Ciudad y ubicación

El antiguo campo libre es `location`, no city. Se conserva sin alterarlo ni inferir UBIGEO; la UI lo muestra como ciudad histórica cuando corresponde. No se borran ni se convierten ambiguamente valores como Bellavista.

UBIGEO se guarda como CHAR(6), manteniendo ceros iniciales. El servidor resuelve el distrito y sus padres desde el catálogo y rechaza códigos inexistentes o jerarquías contradictorias. Cambiar país/departamento/provincia limpia hijos omitidos; un país distinto de PE no mantiene UBIGEO.

Catálogo versionado: `server/profile/ubigeo.json`, 1.892 registros, descargado el 2026-10-01 de [Lista de Ubigeos INEI publicada en Datos Abiertos](https://www.datosabiertos.gob.pe/dataset/datos-de-registros-de-nacidos-vivos/resource/573f433b-0d44-46e2-932e-14abb9757860), [CSV](https://www.datosabiertos.gob.pe/sites/default/files/Lista_Ubigeos_INEI.csv). Es una copia del catálogo disponible en esa fuente; no se afirma que incluya distritos creados después de su publicación. Actualizar el snapshot cuando se publique una versión nueva, conservando códigos que ya estén referenciados y revisando cambios. No se consulta un proveedor externo al editar el perfil, ni se instala una dependencia UBIGEO.

### Imágenes

Avatar y banner reutilizan POST /api/files y las URLs existentes. Formatos JPG/PNG/WebP, hasta 10 MB; el upload valida contenido y extensión. Antes de asociar una imagen se exige propiedad, visibilidad pública y archivo vivo. El bloqueo coordinado compartido con el borrado protege frente a carreras; se impide borrar un banner asociado.

Avatar se previsualiza y guarda con Información. Banner tiene Cambiar banner, vista previa, Guardar banner y Descartar independientes. Un fallo conserva la asociación anterior. Sin banner se usa teamsHero.png. No se borran automáticamente imágenes históricas ni archivos que aún puedan tener otras referencias.

Se mantienen los adaptadores local y S3 sin cambios. La prueba de esta etapa usa storage local; no se realizaron operaciones ni pruebas de conexión contra S3 en producción.

### Privacidad

GET /profile está autenticado y devuelve solo el perfil propio. No se añadieron endpoints públicos. El serializer público del módulo compartido ahora usa una lista explícita de campos permitidos: excluye email, fecha de nacimiento, género, documento, teléfono, ubicación detallada/legacy, userId y documentFileIds. Las superficies públicas existentes de Teams/eventos siguen usando selecciones explícitas sin estos datos.

Los errores no registran el cuerpo del perfil ni números de documento; se conservan los logs seguros existentes. El perfil nuevo permanece PRIVATE; esta etapa no incorpora controles para publicarlo.

## Archivos afectados en esta etapa

- client/src/pages/Profile.jsx, styles/profile.css: layout, pestañas, formularios y estados vacíos.
- client/src/hooks/profile.js, services/profile.js: borradores, guardados e imágenes.
- client/src/hooks/username.js: reutilización de disponibilidad para registro/perfil.
- client/src/app/Application.jsx: actualización de la identidad del header tras guardar.
- server/profile/service.js, validation.js, location.js, ubigeo.json: caso de uso del perfil, validación y catálogo.
- server/app.js, services.js: composición y rutas.
- prisma/schema.prisma y migrations/20261001024_athlete_profile/migration.sql: campos, enums, relación de banner y backfill.
- vendor/usuarios-acceso/src/auth/auth.validation.js e index.js: exportación del validador existente, sin alterar reglas de registro.
- vendor/usuarios-acceso/src/coordination.js: protección del banner asociado.
- vendor/perfil-trayectoria/src/service.js: serializer público explícito.
- tests/athlete-profile.test.js: dos pruebas integradas de perfil y migración.
- scripts/check-athlete-profile-ui.js: recorrido de navegador real en la base de pruebas.
- scripts/check-signup-ui.js: selector del perfil actualizado al nuevo formulario.
- docs/user-registration.md, docs/athlete-profile.md y BACKLOG.md: decisiones y evidencia.

El repositorio ya contenía cambios locales previos de registro y otros módulos; se conservaron. No se creó un commit ni se desplegó producción.

## Verificación mínima

Migración aplicada únicamente en localhost/invictus y localhost/invictus_test. Prisma validate y generate aprobados. No se modifican migraciones históricas.

Tanda mínima: `node --env-file=.env --test --test-concurrency=1 tests/athlete-profile.test.js tests/auth-registration.test.js tests/teams.test.js tests/category-registrations.test.js tests/integration.test.js tests/file-stream.test.js`: **14/14 aprobadas**. Cubre campos, DNI válido/inválido, perfil incompleto, guardados parciales, disponibilidad propia/ocupada, conflictos concurrentes, login, preservación de avatar/banner, propiedad/privacidad de archivos, UBIGEO, migración vacía y poblada, serializer público y privacidad de Teams; reutiliza regresiones de eventos, inscripciones y administración. Después de normalizar location nulo y mover el catálogo a su módulo, se repitió únicamente el caso integrado del perfil: aprobado. Tras unificar la creación del perfil en la inscripción antigua, se repitió únicamente el caso de integración real: aprobado.

`npm run build`: web/admin aprobados. Recorrido `node --env-file=.env scripts/check-athlete-profile-ui.js`: aprobado, sesiones/HTTP/PostgreSQL reales; guardados independientes con borradores, username/header, contacto, banner/avatar y persistencia tras recargar, navegación por teclado y 1440/390 px sin overflow horizontal. Capturas inspeccionadas: .local/screenshots/athlete-profile-desktop.png, athlete-profile-mobile.png y athlete-contact-mobile.png.

No se ejecutó una batería exhaustiva ni se repitieron regresiones sin motivo; se respeta la petición de pruebas mínimas. La prueba manual del usuario y el despliegue permanecen pendientes.

## Siguientes etapas

- Presencia digital: diseñar links relacionados extensibles; no se agregaron columnas por red ni ParticipantSocialLink.
- Deportes: relación de múltiples disciplinas por usuario; no se añadió sport ni un modelo deportivo nuevo.
- Trayectoria: partir de eventos/inscripciones/resultados verificables; no se añadieron resultados, badges ni logros manuales.
- Migrar consumidores de User.name/lastName y evaluar la retirada posterior de la proyección histórica.
