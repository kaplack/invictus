# Panel administrativo

Paquete **local y privado** `@base/panel-administrativo`, versión 0.1.0. No está publicado en npm. Se copia a la aplicación destino y se instala como workspace (o dependencia `file:`); el código del ejemplo se copia y adapta. No instalar este nombre desde el registro público.

Incluye layout React responsive, menú por permisos, marca/colores configurables, estados básicos y middleware Express. No crea usuarios, sesiones, roles, tablas ni almacenamiento. Reutiliza `@base/usuarios-acceso`; los archivos conservan su servicio y comprobación de propietario.

## Ejecutar aquí

Requisitos: Node >=22.12 y npm con workspaces. Desde `D:\webApps\BaseReutilizable`:

```powershell
npm install
npm run dev:panel
```

Abre http://localhost:5179. API local: 127.0.0.1:3101. Credenciales **ficticias**, creadas solo en memoria: `admin@example.test` y `user@example.test`; contraseña `DemoPanel2026!`. La primera tiene `panel:access` y `files:manage`, la segunda ninguno. No hay registro administrativo ni elevación de permisos desde HTTP. Las cuentas registradas por la API de usuarios no obtienen permisos de panel.

```powershell
npm run test:panel
npm run build:panel
npm run start:panel
```

El último comando sirve el build en http://127.0.0.1:3101; detén antes `dev:panel` para liberar el puerto. No necesita `.env`, Docker, PostgreSQL ni S3. Usuarios y metadatos se pierden al reiniciar; los bytes quedan en una carpeta nueva `.local/demo-panel-*`. No es un servidor de producción.

## Incorporarlo a otra aplicación: ejemplo Portal Interno

En una aplicación React/Vite + Express existente, copia estas carpetas conservando sus nombres a `modulos/`: `usuarios-acceso`, `archivos-imagenes` y `panel-administrativo`. No copies `.env`, `.local`, `node_modules` ni datos del origen. Añade esas tres rutas al array `workspaces` de su package.json raíz y ejecuta desde esa raíz:

```powershell
npm install
npm install @base/usuarios-acceso@0.1.0 @base/archivos-imagenes@0.1.0 @base/panel-administrativo@0.1.0 react@19.2.3 react-dom@19.2.3 express@5.2.1 cookie-parser@1.4.7
npm install --save-dev vite@7.3.0
```

Con las carpetas declaradas como workspaces, npm resuelve los nombres `@base/*` localmente. En un monorepo con frontend/backend separados, añade las dependencias a sus respectivos package.json. El frontend debe procesar JSX del paquete. No requiere React Router: utiliza rutas hash (`#/`, `#/archivos`) y escucha atrás/adelante del navegador. Reserva ese hash al panel o adapta su navegación al router del destino.

### Backend: una sola sesión

Conserva tu instancia `authMiddleware` de usuarios y tu instancia `fileService` del módulo de archivos. Monta estas rutas antes del manejador 404, después del parser de cookies y la protección de origen existente:

```js
import { createPanelAccess } from '@base/panel-administrativo';
import { createFileRouter } from '@base/archivos-imagenes';

// Ejemplo: IDs autorizados definidos exclusivamente por el servidor.
// En una app persistente, sustituir el Map por su repositorio de permisos.
const grants = new Map([
  ['ID_REAL_ASIGNADO_POR_TU_APLICACION', ['panel:access', 'files:manage']]
]);
const panel = createPanelAccess({
  resolvePermissions: user => grants.get(user.id) || []
});
app.use('/api/admin', panel.router({ requireAuth: authMiddleware.requireAuth }));
app.use('/api/files', authMiddleware.requireAuth,
  panel.requirePermissions('panel:access', 'files:manage'),
  createFileRouter({ service: fileService, requireAuth: authMiddleware.requireAuth }));
```

El resolver admite promesas y se consulta en cada solicitud. Ausencia de permisos deniega acceso. No recibe permisos del cliente, del registro ni de un rol inventado. El esquema de usuarios actual usa USER; no se modifica para introducir ADMIN.

`GET /api/admin/session` devuelve `{ user, permissions }`, 401 sin sesión y 403 sin `panel:access`. El ejemplo protege **todas** las rutas `/api/files`, incluyendo lectura de política, listado, carga, metadatos, enlaces, contenido, borrado y enlaces públicos. Por ello, en este ejemplo un archivo marcado público también requiere acceso al panel al abrir su enlace. El módulo de archivos original conserva su comportamiento público en los ejemplos anteriores. Si tu aplicación necesita compartir públicamente, monta deliberadamente una ruta pública separada del perímetro administrativo y documenta esa decisión.

No montes otra copia sin protección de los mismos endpoints administrativos. El guard del panel se suma al control de propietario del módulo de archivos. Aplica `panel.requirePermissions('panel:access', 'tu:permiso')` a cada nueva API y usa el mismo nombre en su menú.

Para conservar archivos y cuentas entre reinicios, utiliza el cliente Prisma, migraciones y `configuredFiles` del ejemplo de usuarios, siguiendo sus README. Este módulo no añade migraciones. Configura el origen permitido, cookies seguras bajo HTTPS y almacenamiento con los mecanismos existentes de la aplicación destino; no traslades las cuentas demo.

### Frontend: marca y menú

```jsx
import { AdminPanel } from '@base/panel-administrativo/react';
import '@base/panel-administrativo/styles.css';

const menu = [
  { path: '/', label: 'Inicio', permissions: ['panel:access'],
    render: () => <section><h2>Portal Interno</h2><p>Selecciona una sección.</p></section> },
  { path: '/archivos', label: 'Documentos', permissions: ['files:manage'],
    render: () => <FilesPanel /> }
];
// session procede de GET /api/admin/session; logout usa POST /api/auth/logout.
<AdminPanel user={session.user} permissions={session.permissions}
  brand="Portal Interno" colors={{ primary: '#175674', sidebar: '#172b3a', sidebarText: '#fff' }}
  menu={menu} onLogout={logout} />;
```

Cada entrada define `path` único, `label`, `permissions` (todos necesarios) y `render`. Sin permisos declarados basta el acceso general al panel. Las rutas inexistentes o no autorizadas muestran un estado seguro y enlace de vuelta; un menú vacío muestra instrucciones. La marca es texto; los colores son variables CSS y deben mantener contraste legible.

Para un punto de partida completo, copia y adapta `ejemplos/panel-administrativo/src`. Este ejemplo importa sin duplicarlos `AccessForm`, `FilesPanel`, `api.js`, `services/authService.js`, `services/fileService.js` y `styles.css` desde el ejemplo de usuarios. En otra aplicación copia esos archivos juntos o ajusta los imports hacia sus componentes equivalentes. La pantalla de archivos pertenece al **ejemplo**, no al export del paquete de archivos. Sus servicios usan `/api/files`; configura el proxy de Vite al puerto real de tu API. Importa primero los estilos base y después los del panel.

El host controla carga, login, logout, error recuperable y acceso denegado (`PanelApp.jsx` es la referencia ejecutable). No guardes tokens en localStorage ni crees una segunda sesión. Las respuestas de API siguen siendo la autoridad aunque el menú esté visible.

## Estructura y límites

- `src/server.js`: resolver inyectado, guard y router de sesión del panel.
- `src/AdminPanel.jsx`: layout, navegación hash, diálogo móvil nativo, salto al contenido y estados.
- `src/styles.css`: estilos propios con prefijo `panel-` y tokens de marca.
- Ejemplo `server/app.js`: composición sobre `createApp` existente; `demo.js`: dependencias efímeras; `server.js`: arranque local.
- Ejemplo `src/app`: composición de sesión; `src/config.jsx`: marca y páginas. Servicios HTTP y formularios son los existentes.

La factoría anterior `createApp` solo añade opciones optativas `configureRoutes`, `fileGuard` y `staticDirectory`; sus valores predeterminados conservan las rutas, autenticación y almacenamiento anteriores. Los módulos 1 y 2 no cambian.

## Verificación

`npm run test:panel`: dos pruebas HTTP reales con autenticación/hashing y repositorios en memoria. Cubren acceso autorizado, endpoints de archivos, cierre de sesión, denegación de usuario sin permisos y permiso de archivos revocado. No ejecuta las suites anteriores. Compilación: `npm run build:panel`.

El recorrido visual y pendientes concretos se registran en la [ficha](../../catalogo/panel-administrativo.md). No se ha probado aún en otra aplicación, PostgreSQL ni S3.
