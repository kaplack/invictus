# Archivos e imágenes

Parte 4: [adaptadores, contratos de uso y límites de integración](../../docs/adaptadores-integracion.md). Los nuevos flujos de cobro requieren cerrar la parte 5 antes de habilitarse.

Módulo ESM reutilizable con servicio, router Express, repositorio Prisma inyectado y adaptadores local/S3. Integra `requireAuth`, `AppError` y las cookies de `@base/usuarios-acceso`; no sustituye su autenticación.

## Ejecutar

Desde la raíz, Node >=22.12: `npm install` y `npm run dev:files`. Abre http://localhost:5178 y registra una cuenta ficticia. Este modo no lee `.env`, no requiere credenciales, PostgreSQL ni S3. Usuarios y metadatos viven en memoria; los bytes se escriben en una carpeta nueva `.local/demo-files-*`. Al reiniciar se pierde el acceso a esas cargas. Las carpetas de sesiones anteriores pueden borrarse manualmente con el servidor detenido.

Para persistencia normal: copia `.env.example` a `.env` si aún no existe, inicia PostgreSQL local con `docker compose up -d --wait`, ejecuta `npm run db:generate`, `npm run db:migrate` y `npm run dev`. La migración aditiva `202609210002_files` añade `stored_files` con propietario relacionado a `users`, visibilidad restringida, tamaño positivo e índice. No altera los registros de usuarios existentes. La clave de objeto es un UUID generado por el servidor, independiente del nombre original.

## Configuración

El ejemplo persistente lee estas variables; los valores omitidos usan los predeterminados:

| Variable | Predeterminado / significado |
| --- | --- |
| `FILES_STORAGE` | `local`; alternativa `s3` |
| `FILES_LOCAL_DIRECTORY` | `.local/files`, dentro del proyecto, fuera del directorio web |
| `FILES_MAX_BYTES` | `6291456`, entre 1 y 104857600 bytes |
| `FILES_ALLOWED_TYPES` | `image/png,image/jpeg,image/webp,application/pdf,text/plain` |
| `FILES_URL_TTL_SECONDS` | `120`, entre 1 y 3600 segundos |
| `FILES_SIGNING_KEY` | Opcional: mínimo 32 bytes. Sin valor, clave aleatoria por proceso; reiniciar invalida enlaces. En varias instancias debe compartirse de forma segura. |
| `FILES_S3_BUCKET`, `FILES_S3_REGION` | Obligatorios al elegir S3; usar un bucket exclusivo de pruebas |
| `FILES_S3_ENDPOINT` | Opcional para almacenamiento compatible |
| `FILES_S3_FORCE_PATH_STYLE` | `false`; `true` para servicios que lo requieran |
| `FILES_S3_PREFIX` | `files/` |

El SDK usa su cadena estándar de credenciales; no hay credenciales, buckets ni endpoints heredados de los proyectos originales. Cambiar de backend o carpeta no migra objetos existentes: utiliza un conjunto de metadatos separado o migra los objetos antes de cambiar configuración.

La lista permitida puede restringir los cinco formatos implementados. Se verifican bytes reales, extensión, MIME y cabeceras de PNG/JPEG/WebP/PDF; TXT exige UTF-8 sin controles binarios. Esta comprobación no es una decodificación completa ni análisis antimalware. PDF/TXT se descargan como adjuntos; imágenes se sirven con `nosniff` y CSP restrictiva. No se permiten SVG, HTML, ejecutables ni documentos Office. La carga usa un cuerpo binario, limitado antes de persistir, sin base64 ni multipart. No se admiten cuerpos comprimidos.

## Contrato HTTP

Montaje de ejemplo: `/api/files`. Respuestas de error: `{ error: { code, message } }`. Solicitudes de escritura requieren el `Origin` local admitido y cookie de sesión. Excepto la carga, usan `Content-Type: application/json`.

| Método y ruta | Comportamiento |
| --- | --- |
| `GET /policy` | Política configurada, con sesión |
| `POST /` | Cuerpo binario, `Content-Type`, `X-File-Name` codificado con `encodeURIComponent`, `X-File-Visibility: private\|public` (privado por defecto). Devuelve 201 y `{file}`. El propietario siempre viene de la sesión. |
| `GET /?offset=0` | Hasta 50 archivos propios activos, `{files}` |
| `GET /:id` | Metadatos privados solo para su propietario; públicos para usuarios autenticados |
| `GET /:id/access` | `{url, expiresAt}`; los privados solo para el propietario |
| `GET /:id/content?expires=...&signature=...` | Comprueba firma HMAC, caducidad, sesión activa y propietario; transmite bytes |
| `GET /:id/public` | Sin sesión, únicamente archivos públicos; URL estable hasta eliminación |
| `DELETE /:id` | Solo propietario, incluso en archivos públicos; 204 |

Los accesos ajenos a privados responden 404 para no revelar existencia. Ni roles ni propietarios enviados por el cliente otorgan permisos. Logout/suspensión bloquean las siguientes lecturas privadas. Un enlace privado copiado tampoco funciona con la sesión de otro usuario. Los enlaces públicos sí pueden compartirse. Los bytes ya descargados no se pueden revocar.

Ambos adaptadores mantienen objetos sin exposición directa. **S3 también transmite los bytes a través de la API**, tras comprobar el enlace temporal y la sesión; deliberadamente no redirige a una URL S3 portadora que otro usuario podría reutilizar. No hacen falta ACL públicas, política pública del bucket ni CORS del bucket. S3 utiliza Put/Get/DeleteObject y cifrado AES256. Mantener Block Public Access activado.

Primero se escriben bytes y luego metadatos; si falla la persistencia se intenta retirar el objeto. Al eliminar, primero se marca una baja para revocar acceso y luego se eliminan bytes. Si falla el backend, el propietario puede repetir DELETE usando el mismo id. No hay transacción distribuida: caídas pueden dejar objetos huérfanos y deben reconciliarse operativamente. En buckets versionados, DeleteObject no purga versiones históricas: definir retención/lifecycle o implementar purga antes de exigir borrado físico irreversible.

## Reutilizar

`createFileService({repository, storage, policy, signingKey})` no depende de Express. `createFileRouter({service, requireAuth})` adapta HTTP; el host debe aplicar protección de origen/CSRF antes del router, cookies y el manejador común de errores después. Montar el router antes de parsers de cuerpo globales que consuman las cargas. El ejemplo en `ejemplos/usuarios-acceso/server/app.js` muestra esta integración.

`storage` implementa `put({key, body, contentType, ownerId})`, `get(key)` (stream Node) y `remove(key)`. `repository` implementa `create`, `find`, `list(ownerId, offset)` y `markDeleted`. El repositorio en memoria se limita al ejemplo y las pruebas; Prisma es el modo persistente.

## Verificación

`npm run test:files`: **3/3 aprobados**, únicamente tres casos HTTP con almacenamiento local: carga válida y lectura por su propietario; rechazo de ejecutable; acceso privado denegado a otro usuario, incluyendo URL temporal copiada y ruta pública. La autenticación/hashing/cookies son reales; la persistencia de usuarios y metadatos está simulada. `npm run build` y `npm run db:generate` también completados. No sustituye pruebas de PostgreSQL, caducidad, límite de tamaño, borrado o navegación visual, que no forman parte de la batería mínima solicitada.

S3 no se ha probado. Antes de habilitarlo, verificar en un bucket aislado: credenciales/IAM mínimas para el prefijo, cifrado, Put/Get/Delete, streaming y errores, política de versiones y ausencia de exposición pública directa. No ejecutar estas verificaciones contra producción.
