# Navegación pública simplificada

El catálogo único está en /. /eventos y los enlaces antiguos #/ se normalizan conservando los detalles compartidos. La web pública usa History API; el panel administrativo separado conserva su router existente.

El buscador está junto al listado, fuera del hero. Mis eventos aparece solo en el menú de cuenta autenticada. Crear evento lleva al acceso cuando falta sesión, después comprueba Profile y abre el formulario o permite completar el perfil y continuar.

Las acciones usan iconos con etiquetas accesibles, áreas de 44 px y tooltips al apuntar o enfocar. Escape cierra el tooltip.

Los enlaces de inscripción conservan su token firmado y los controles existentes de acceso. La página aplica Referrer-Policy no-referrer mediante meta para no transmitir la URL privada al navegar. El token es una credencial: no registrar ni compartir URLs privadas en analítica o logs; la configuración del hosting debe excluirlas. No cambia la base de datos.

## Hosting

Vite admite recarga y entrada directa de las rutas. El artefacto público incluye _redirects para hosts compatibles (Netlify/Cloudflare Pages). En otro servidor configurar fallback SPA a index.html para las rutas de la web, conservando /api y assets fuera de ese fallback; por ejemplo en nginx: location / { try_files $uri $uri/ /index.html; }, con la ubicación /api configurada por separado. No hay configuración ni destino de hosting identificado en este repositorio; producción y su regla de fallback requieren verificación al desplegar. El panel administrativo se publica como artefacto separado.

## Validación mínima

Una prueba de interfaz local comprueba catálogo/búsqueda, móvil 390/320 px, login que continúa creación, enlace directo y recarga de detalle/Mis eventos, atrás, compatibilidad de enlace anterior y tooltip con foco/Escape. Compilación web y admin.

Resultado local: prueba dirigida aprobada, incluyendo perfil inicialmente incompleto → guardar → formulario de evento; ambas compilaciones aprobadas. Hero móvil: 87 px a 390x844 y 84 px a 320x568.
