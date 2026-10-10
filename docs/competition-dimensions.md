# Dimensiones de competencia

El editor personal configura precio por distancia, cupo total, modalidades por distancia (nombre y reglas de equipamiento) y divisiones globales por género/edad. No multiplica categorías ni precios por combinaciones. Los rangos son inclusivos, enteros de 0 a 120 y no se superponen. Las modalidades son libres y no se precargan nombres ni reglas sin autorización del organizador.

## Datos y compatibilidad
Event.competitionConfig contiene genderEnabled, ageGroupsEnabled y ageGroups [{minAge,maxAge}]. EventCategory se reutiliza como distancia con su precio; modalities es una lista de {name,description}. Nueva configuración utiliza capacity/gender/minAge/maxAge/modality históricos en null. Los eventos históricos conservan competitionConfig null, campos existentes y snapshots; abrir/guardar el editor sin activar divisiones o editar modalidades conserva las restricciones previas. La configuración y sus precios/modalidades quedan fijos al publicar o recibir inscripciones, según las reglas actuales.

Migración aditiva 20261010003_event_competition_dimensions: competition_config nullable y modalities con valor [] para filas previas; checks JSON de objeto/array. Aplicada primero en invictus_test y después, tras verificar, en invictus local. Cliente Prisma regenerado. Sin push ni despliegue externo.

## Inscripción y revisión
Formularios con y sin cuenta piden fecha de nacimiento, sin mostrar la edad calculada. Distancia determina el precio; modalidad se elige entre las habilitadas en esa distancia. Género se pide cuando está activada la división o existe una restricción histórica. Edad se calcula internamente en la fecha del evento y su zona horaria. Inscripciones sin distancias también recogen nacimiento y pasan por revisión. La API histórica de inscripción general vacía se conserva solo en eventos sin competitionConfig; el formulario actual siempre manda datos.

categorySnapshot conserva reglas, fecha de referencia, modalidad/equipamiento y classification {modality,gender,ageGroup}. participantSnapshot conserva la fecha declarada. Si la edad no encaja, ageGroup=null y classificationWarning indica «Fuera de los rangos de edad configurados»; se admite la inscripción PENDING_REVIEW. Listado y detalle del organizador muestran el aviso. El organizador puede aceptar, observar o rechazar con las acciones existentes. Correcciones actualizan la clasificación con las reglas originales; cambios del perfil no alteran los snapshots. La fecha de nacimiento no se expone en la ficha pública.

## Verificación mínima
Prisma validate, build web/admin y pruebas dirigidas contra PostgreSQL local: dos casos nuevos en tests/competition-dimensions.test.js (precios, modalidades, rangos, límites, permiso, cupo total, invitado/autenticado, observación/corrección, privacidad y general histórico), dos casos de invitados y caso de pagos personales con Yape/Plin. Fixtures incluyen nacimiento; la expectativa histórica de despublicar con inscritos se ajustó a la regla ya vigente. Recorrido scripts/check-competition-dimensions-ui.js aprobado: crear/configurar/recuperar/revisar/publicar, inscripción invitada y aviso/acciones del organizador. Capturas desktop/mobile revisadas en test-results/dimensions; sin overflow horizontal.

## Futuro por discutir
- Precio por modalidad: definir si es tarifa final o suplemento por distancia; moneda, validación, presentación, conservación de cotizaciones/comprobantes y cambios posteriores. No implementado.
- Cupo por distancia: definir si subdivide el total o añade límites independientes; relación entre suma de cupos y máximo total, reservas/liberación, concurrencia y visualización de disponibilidad. No implementado en el flujo nuevo; las capacidades históricas se conservan.

La comprobación puntual scripts/check-general-registration-ui.mjs cubre inscripción general con cuenta y acceso a corrección desde Mis inscripciones. Ese listado muestra la clasificación guardada y habilita detalle/corrección también sin categoryId cuando la inscripción tiene los nuevos datos.


## Catálogo de modalidades del evento

Las modalidades se definen una sola vez en `competitionConfig.modalities` con nombre y descripción del equipamiento. Cada distancia conserva en `modalities` las opciones que ofrece, por lo que la inscripción sigue mostrando únicamente las habilitadas para el recorrido seleccionado.

Al crear una modalidad se selecciona por defecto en todas las distancias. Las distancias nuevas reciben todas las modalidades existentes. El organizador puede desmarcar excepciones; editar el nombre o equipamiento conserva estas exclusiones, y eliminar una modalidad elimina sus asignaciones. Sin modalidades, el participante no recibe este campo.

No se requiere migración porque se reutiliza el JSON de configuración. El catálogo es un campo opcional para conservar los contratos históricos; al editar eventos anteriores se recupera de las modalidades de sus distancias.
