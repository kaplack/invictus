# Trayectoria externa — primera etapa

La trayectoria permite conservar historia previa a Invictus. No acredita asistencia ni resultados oficiales. No requiere eventos existentes ni completar el perfil para usar la plataforma.

## Datos y persistencia

ExternalParticipation pertenece a ParticipantProfile y reutiliza Discipline. Evento, disciplina y año (1900 hasta el año actual en Perú) obligatorios. Fecha exacta opcional, sin fechas inventadas: debe existir, corresponder al año y no ser futura. Lugar, prueba/distancia, categoría, resultado textual, posición positiva, organizador, descripción y enlace oficial opcionales. No se añaden deportes al perfil automáticamente.

Migración nueva: 20261002027_external_trajectory. Solo crea tabla, relaciones, índices y restricciones año/fecha/posición. Conserva los datos existentes. Las disciplinas referenciadas no se eliminan en cascada. No se persiste un estado de verificación editable: la API responde EXTERNAL/DECLARED.

## API autenticada

GET /api/profile/trajectory lista únicamente la historia propia, ordenada por año descendente, fecha descendente (sin fecha al final) y creación. POST crea, PUT /:id reemplaza datos editables y DELETE /:id elimina. Propietario obtenido de sesión; accesos a IDs ajenos responden 404. Lectura vacía no crea un perfil. Primera escritura crea el perfil si falta mediante el servicio existente, en transacción. Catálogo reutilizado: GET /api/disciplines. Nuevas relaciones requieren disciplina activa; editar una referencia histórica inactiva conserva esa disciplina.

URLs normalizadas a HTTPS cuando no traen esquema. Solo HTTP/HTTPS; no credenciales, puertos personalizados, hosts locales/IP ni protocolos peligrosos. Longitud máxima 2048. Enlace oficial es una referencia declarada, no evidencia verificada.

## Interfaz

Formulario independiente en Trayectoria; campos opcionales plegables. Guardado explícito y feedback existente; eliminación con confirmación dentro de la fila. Timeline por año, filtro local con disciplinas presentes, etiquetas textuales de origen, enlaces externos con noopener noreferrer. No se modifica Tu identidad ni las otras pestañas.

## Verificación y pendientes

Pruebas mínimas: tests/trajectory.test.js (dos casos agrupados: CRUD/propiedad/conservación; autenticación/validación). Regresión tests/athlete-profile.test.js. Recorrido visual scripts/check-trajectory-ui.js en desktop/mobile y build:web.

Pendiente: documentos/fotos de evidencia, resultados oficiales, timeline de varias fuentes, moderación, badges, credenciales y QR; ver BACKLOG.md. Resultado por ahora es texto libre; unidades y posiciones de categoría pertenecen al diseño futuro. No hay paginación aún: evaluar cuando crezca el historial.
