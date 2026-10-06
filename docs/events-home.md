# Home y navegación del MVP — etapa 6

Implementado localmente el 2026-10-03. Sin migraciones ni despliegue.

## Home

Hero corto con mensaje, búsqueda y CTA Crear evento. Próximos eventos aparecen inmediatamente debajo, con cards compartidas con el catálogo existente. Sin landing institucional ni módulos comerciales en la experiencia inicial.

Home usa GET /api/events?upcoming=1. Se extiende el endpoint existente con un filtro opcional de fecha futura y datos públicos de disciplina/precio ya existentes. El catálogo sin parámetro mantiene los publicados históricos. La ficha individual y URLs públicas se conservan.

EventCards se extrae del listado anterior y se reutiliza en Home/catalogo: imagen o placeholder existente, nombre, fecha en la zona horaria del evento, ubicación, disciplina, precio si corresponde y CTA. Informativos usan Más información y no se etiquetan como gratuitos. Precios se leen de categorías activas o configuración existente; no se duplican en Event.

Búsqueda inmediata por título, lugar, disciplina u organizador, tolerante a tildes. Estado de carga/error/vacío y limpiar búsqueda reutilizan componentes existentes. Se conserva el límite de 100 eventos del endpoint: búsqueda sobre los próximos 100 eventos devueltos, sin paginación/filtros avanzados nuevos.

El hero antiguo permanece como LegacyLanding junto con sus recursos/estilos, fuera de la ruta inicial. No se eliminan imágenes ni funcionalidades.

## Visibilidad

client/src/app/capabilities.js centraliza únicamente dos opciones visibles: teams=false, commerce=false. Se pueden activar separadamente en un incremento posterior; esto no cambia autorización ni permisos del servidor.

- Navegación principal: Eventos y Mis eventos. Menú de cuenta: Perfil, Inscripciones, Mis eventos y Gestión según permisos existentes.
- Teams, tienda, pedidos, carrito y cotizaciones dejan de aparecer en navegación y footer. Acceso directo a sus rutas muestra un estado de sección no disponible; componentes y APIs siguen conservados.
- Mis eventos del organizador muestra eventos personales; los eventos históricos de Team permanecen en datos y herramientas administrativas existentes, listos para reactivar la experiencia de Teams.
- Superadmin conserva gestión de eventos informativos, eventos existentes y usuarios. Productos, pedidos/pagos comerciales y cotizaciones salen temporalmente del menú. El botón anterior de creación gestionada por Team se conserva detrás de la visibilidad de Teams; durante el MVP lleva a Crear evento personal desde la web.
- Profile ampliado ya estaba oculto en su formulario básico. No se cambian modelos de comunidad, logros, Teams, tienda ni perfiles.

## Verificación mínima

scripts/check-events-home-ui.js: un recorrido de producto usando invictus_test y navegador local. Publicación de un gestionado e informativo como fixtures; cards, disciplina, precio, búsqueda por nombre y tildes, cero resultados/limpiar, CTA hacia acceso, menú de cuenta y ruta fuera del MVP. Sin suite de backend nueva ni pruebas de módulos ajenos.

Capturas inspeccionadas en .local/screenshots/events-home-*.png. Móvil 390x844: hero 143 px (17%). Móvil 320x568: hero 140 px (25%). En ambos casos cumple el máximo de 35%, se ve parte del primer evento y no hay desbordamiento horizontal. Escritorio 1440 px aprobado. Compilación web/admin aprobada.

## Próximo cierre

La identidad Profile/User fue adaptada después (ver profile-identity.md). Cierre local y preparación de despliegue documentados en mvp-release.md, con las comprobaciones mínimas necesarias. Cambios de producción aún pendientes; las capacidades existentes no se han eliminado.

## Ajuste de navegación 2026-10-03

El Home es el catálogo único; /eventos redirige en cliente a /. Se eliminó Ver todos, el buscador pasó al listado y Mis eventos queda únicamente en el menú de cuenta. URLs limpias y continuidad de creación documentadas en public-navigation.md.
