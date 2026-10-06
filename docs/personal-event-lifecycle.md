# Reglas de eventos personales

- Borrador sin inscripciones y antes del inicio: permite configurar información, categorías, precios y pagos; publicar exige información completa y fecha futura.
- Publicado futuro sin inscripciones: puede despublicarse para configurar condiciones.
- Publicado con inscripciones: no puede despublicarse; fecha, zona horaria, título, disciplina, cupo, categorías y precios permanecen fijos. Descripción, imagen y ubicación pueden editarse.
- Desde la fecha/hora de inicio: bloquea publicar/despublicar y modificar condiciones incluso sin inscripciones. Conserva consulta y gestión de inscritos, contenido permitido y página pública cuando sigue publicado.

No convierte automáticamente el evento en FINISHED: la hora de inicio no determina su término. El catálogo de próximos eventos continúa filtrando por fecha futura.

Lifecycle se calcula a partir de Event y el conteo existente de inscripciones. Mis eventos/editor reciben el motivo del bloqueo. Un DRAFT pasado aparece como Histórico · no publicado; un DRAFT futuro con inscritos como Despublicado con inscripciones. Son etiquetas informativas, sin agregar estados a la base. No se modificaron los registros anteriores para recuperar publicaciones.

Reglas de escritura bajo el bloqueo transaccional existente del evento, tanto para publicación como edición/configuración. Se mantiene el flujo de Teams e informativos. No hay nuevas tablas ni migraciones.

Se corrigió draftPatch para que una edición parcial no aplique los valores por defecto de creación a los campos omitidos, conservando la fecha y descripción existentes.

Verificación mínima: un test integrado en tests/personal-event-lifecycle.test.js aprobado, que cubre despublicar sin inscritos, bloqueo con inscritos/después del inicio, contenido permitido, condiciones bloqueadas, gestión de inscritos, página pública y catálogo futuro, histórico DRAFT y conservación de registros. Compilaciones web/admin. Sin pruebas visuales.
