# Creación y edición personal de eventos

Página /mis-eventos/nuevo y /mis-eventos/:id/editar. Tres secciones accesibles directamente: información, inscripciones/pagos y revisión/publicación. Reutiliza User/Profile, Event, EventCategory, EventRegistrationConfig, TeamPaymentMethod con eventId, EventPaymentMethod y StoredFile; los formularios anteriores de Teams/admin se conservan.

La interfaz usa la paleta de Invictus, acción azul para guardar/continuar y dorada para publicar. Imagen pública y QR privado tienen preview, Agregar/Cambiar imagen y validación de formato/tamaño. No se añade editor de fotos.

Guardar borrador requiere nombre. Fecha/descripción/lugar pueden estar pendientes; no se inventan fechas. Se muestra Fecha por definir. Categorías o inscripción general aceptan precio 0 para gratis; una inscripción general de pago reutiliza una categoría general. Filas de categorías requieren nombre para persistir y conservan restricciones históricas. Los datos parciales de Yape/Plin se guardan como métodos personales inactivos; no se habilitan para participantes ni crean receptor hasta completarse. En eventos gratuitos se oculta la sección de pagos.

El guardado usa los endpoints existentes en orden. Si una sección falla, la información anterior ya guardada se conserva y el error se muestra; se mantienen los identificadores recibidos para evitar duplicar categorías/cuentas al reintentar. No se introduce una transacción nueva que agrupe todos los endpoints.

El borrador no aparece en el catálogo ni recibe inscripciones. Publicar exige descripción, fecha futura, ubicación, configuración y medios completos para las categorías de pago. Las reglas se verifican también en servidor. Con inscripciones se conservan fecha exacta, zona horaria, disciplina y cupo. Configurar categorías/pagos exige borrador sin inscripciones. Se avisa al salir con cambios pendientes.

## Base de datos

032 hace starts_at nullable y añade una restricción para exigir fecha fuera de DRAFT. 033 permite datos móviles incompletos solo en métodos personales inactivos. Conserva requisitos de métodos activos y de Teams. No se agregan tablas ni se borran datos. Ambas migraciones se aplicaron exclusivamente en invictus e invictus_test locales; producción requiere despliegue versionado y cliente Prisma actualizado.

## Verificación

Un único recorrido funcional en scripts/check-event-editor.js: borrador solo con nombre, reapertura, rechazo de publicación incompleta, imagen/QR, categorías gratuita/de pago, Yape parcial inactivo, completar/persistir/publicar y aviso al salir con cambios. Aprobado. Sin capturas ni revisión visual; esta corresponde al usuario. Compilación web/admin.
