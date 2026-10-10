# Logística del evento

Formulario personal: se conservan los tres pasos. El cupo está en Inscripciones y pagos. Información incorpora bloques desplegables opcionales de concentración, entrega de kits y ruta. Revisar muestra los bloques configurados y enlaces a editar.

Se reutilizan startsAt/timeZone para el inicio, ImagePicker/upload/StoredFile para la ruta y los endpoints existentes. Sin nuevas tablas ni endpoints. Migración aditiva 202610050034_event_logistics aplicada a invictus e invictus_test locales; desplegarla antes de ejecutar esta versión en otros entornos.

Campos Event: meetingAt/meetingVenue; kitEnabled/kitStartsAt/kitEndsAt/kitVenue/kitAddress; routeImageFileId con FK a StoredFile. Los instantes se guardan en UTC; formulario en hora de Lima y detalle usa timeZone. Concentración sin lugar usa venue. El horario de kits puede abarcar dos fechas. Sin logística, los eventos existentes siguen publicándose.

Borradores permiten kits incompletos. Publicación y modificaciones de eventos publicados requieren kits completos si kitEnabled y concentración no posterior al inicio. El final de kits debe ser posterior al inicio (servicio y CHECK SQL). Desactivar kits conserva sus campos y oculta el bloque. Quitar ruta desvincula la imagen sin borrar el archivo.

Ruta pública: reutiliza validación de imagen, propietario y visibilidad y comprobación transaccional de archivos vigentes. La eliminación de un archivo referenciado está bloqueada. No hay mapas interactivos ni nuevas dependencias.

Verificación: dos pruebas integrales dirigidas en invictus_test (logística/archivos/publicación/compatibilidad y ciclo de vida/conteo público) y compilaciones web/admin. Pruebas visuales a cargo del usuario.

## Precisión de horarios
El formulario presenta una fecha del evento, una ubicación compartida, hora de concentración y hora de salida. Concentración no lleva etiqueta opcional ni required y no bloquea publicar si está vacía. Se reutilizan startsAt (fecha+salida) y meetingAt (misma fecha+concentración); no hay nuevas columnas. meetingVenue se conserva para compatibilidad pero no se solicita ni se muestra. El backend exige mismo día en timeZone y concentración no posterior a salida cuando está informada. Kits mantiene fecha y lugar propios.

## Periodo y horario diario de kits
Migración aditiva 035 aplicada en ambas bases locales. kitDateFrom/kitDateTo son fechas; kitTimeFrom/kitTimeTo representan horario diario; kitInstructions es texto libre (máximo 2000 caracteres). Se mantienen kitStartsAt/kitEndsAt/kitAddress por compatibilidad; la migración copia fechas y horas existentes usando timeZone. Lugar y dirección previos se combinan al editar; al guardar se utiliza únicamente kitVenue. Fecha hasta admite el mismo día y no puede ser anterior. Hora hasta debe ser posterior. Las instrucciones no son obligatorias ni habilitan pagos.
Prueba dirigida de logística aprobada, incluyendo rango de fechas y horario diario. Build web aprobado. Visuales a cargo del usuario.

## Galería de rutas — 2026-10-10
La sección se llama «Rutas del evento», sin «opcional». El botón «＋ Agregar imagen de ruta» permite añadir entradas sin un límite fijo de cantidad. Cada entrada incluye imagen pública, título obligatorio (hasta 180 caracteres) y descripción libre (hasta 2000 caracteres). Permite reemplazar, quitar y ordenar con botones de subir/bajar; una ruta puede tener varias imágenes. Se comparte entre editor personal y formulario informativo. El detalle público presenta título y descripción junto a cada mapa y permite ampliarlo.

Contrato: routeImages es un array ordenado de {fileId,title,description}; omitirlo en PATCH conserva la galería y [] la vacía. Migración 20261010001_event_route_images crea la tabla con FK a eventos y archivos y convierte las rutas existentes en una entrada «Ruta del evento». routeImageFileId mantiene la primera imagen para compatibilidad; clientes antiguos que lo modifican sustituyen la galería. Se conservan validación de propiedad/visibilidad y bloqueo de eliminación de archivos referenciados. Quitar una entrada no borra el archivo. Migración aplicada en invictus e invictus_test locales; desplegarla en otros entornos antes de esta versión.

Verificación mínima: 2/2 pruebas de tests/event-logistics.test.js (incluye compatibilidad, permisos, orden y retiro), build web/admin, Prisma validate y recorrido real en invictus_test de scripts/check-route-images-ui.js. Escritorio 1440 y móvil 390 sin overflow; capturas revisadas en test-results/routes. Para almacenamiento de pruebas fuera de .local puede usarse EVENT_TEST_UPLOAD_DIRECTORY=test-results/route-uploads.

Presentación de entradas: tarjetas separadas con encabezado, borde y espacio interior; sangría de 16 px (escritorio) y 8 px (móvil). Se elimina la etiqueta visual duplicada del selector de imagen y se conserva su nombre accesible.

## Tiempo límite de competencia — 2026-10-10
Checkbox desmarcado por defecto inmediatamente antes de Imagen del evento en EventEditor. Al marcarlo muestra Horas y Minutos usando Field/form-grid; el total debe ser positivo, ambos enteros no negativos y minutos entre 0 y 59. El helper compartido convierte a minutos y formatea la duración como «3 h 00 min». Al editar se recuperan horas/minutos; desmarcar envía null. Aparece en Revisar y publicar y en la ficha pública únicamente cuando existe. No se implementa cierre automático ni cronómetro.

Persistencia: Event.timeLimitMinutes Int? (time_limit_minutes), validación Zod de 1 a 2147483647 o null; PATCH omitido conserva el valor. Migración 20261010002_event_time_limit agrega columna nullable y CHECK positivo. Eventos anteriores quedan sin límite. Aplicada primero en invictus_test y, tras verificar, en invictus local. No se realizó push ni despliegue externo.

Pruebas mínimas: 2/2 pruebas dirigidas de tests/event-logistics.test.js con --test-name-pattern='Tiempo límite|Logística opcional' (creación null/180/90, modificación, conservación, retiro, inválidos, detalle público y kits). scripts/check-time-limit-ui.js verifica checkbox inicial, recuperación, cero, edición, revisión, dato público y ocultamiento al retirar; escritorio/móvil y capturas revisadas sin overflow. Prisma validate y build web/admin aprobados.
