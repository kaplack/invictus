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
