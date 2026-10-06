# Vista previa al compartir enlaces

El build público incluye Open Graph con título, descripción e imagen general (la fotografía existente images/evento.png). Configurar PUBLIC_WEB_URL con el origen HTTPS público antes de compilar; VITE_PUBLIC_URL se admite como respaldo. VITE_API_URL conserva su función para instalaciones con API separada.

En producción Express sirve dist y genera el HTML de /eventos/:slug usando el servicio público existente: solo eventos publicados. Usa el afiche principal, después el banner y finalmente la imagen general. La imagen de cada evento se entrega desde /api/files/:id/public, con los controles públicos existentes. No se exponen archivos privados ni se agregan credenciales a los enlaces. El HTML conserva la aplicación React y aplica los mismos metadatos para usuarios y robots.

## Hosting

Ejecutar npm run build y npm start con NODE_ENV=production y PUBLIC_WEB_URL configurados. Si la web usa un host estático separado, dirigir / y /eventos (incluyendo /eventos/*) al servidor Express de esta versión, conservando el origen público y /api. Los demás recursos pueden seguir en el host estático. Un fallback estático a index.html ofrece únicamente la imagen general: las vistas por evento requieren el HTML dinámico de Express. La API debe tener acceso al directorio dist del mismo build. No hay destino de hosting identificado en este repositorio.

## Comprobación

node --test tests/social-preview.test.js verifica HTML inicial, escape de contenido, URLs absolutas, afiche/respaldo, rechazo de eventos no públicos y ausencia del token privado en metadatos. npm run build verifica los artefactos de web y administración.

Después de desplegar, consultar el HTML de / y /eventos/un-slug-publicado y abrir su og:image sin sesión. Compartir ese enlace por WhatsApp para comprobar el resultado real. WhatsApp puede conservar vistas previas anteriores en caché; la implementación local no confirma el comportamiento en producción. Los enlaces antiguos con # siguen navegando, pero para una vista específica compartir /eventos/slug.
