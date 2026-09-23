# Incorporar pedidos y pagos manuales

Dos componentes de dominio, una integración explícita. `../pedidos/src` contiene precios, pedidos, estados y rutas. `../pagos-manuales/src` contiene intentos de pago, revisión, comprobantes y rutas. Esta carpeta contiene la unidad de trabajo PostgreSQL y la protección de comprobantes. Servicios → interfaz `store` → Prisma; los routers solo adaptan HTTP. El pedido guarda líneas históricas en JSONB y el pago referencia el pedido, sin mezclar ambos estados.

## Dependencias

Node >=22.12, Express 5.2.1, Prisma / cliente 6.19.0, PostgreSQL y los módulos existentes `usuarios-acceso`, `archivos-imagenes`, `panel-administrativo`. Frontend: React 19 y Vite 7 del ejemplo. No hay dependencias externas nuevas ni integración con Yape/Plin. Estos nuevos módulos usan imports ESM relativos; al copiarlos conserva la estructura `modulos/` o adapta sus imports. Los paquetes `@base/*` existentes se resuelven mediante los workspaces del proyecto.

## Ejemplo ejecutable sin servicios externos

Desde la raíz:

```powershell
npm install
npm run dev:panel
```

Abre `http://localhost:5179`. Cliente: `user@example.test`; administrador: `admin@example.test`; otro cliente: `other@example.test`. Contraseña ficticia de todos: `DemoPanel2026!`. Las cuentas no se copian del origen. Metadatos y usuarios desaparecen al reiniciar; los bytes quedan en `.local/demo-panel-*`. No se lee `.env` en esta demo.

1. Entra como cliente; selecciona 2 cuadernos y 1 bolsa (PEN 43.00) y crea el pedido.
2. En el detalle elige efectivo, o Yape/Plin y el archivo local `ejemplos/panel-administrativo/comprobante-demo.txt`; registra el pago.
3. Cierra sesión. Entra como administrador, abre **Pedidos y pagos**, elige el pedido y descarga su comprobante. Verifica o escribe un motivo y rechaza.
4. Usa **Aceptado** y luego **Completado** para administrar el pedido. Esas acciones no cambian el pago. Tras un rechazo el cliente puede registrar otro intento mientras el pedido esté abierto.

Para servir el build: `npm run build:panel`, luego `npm run start:panel` y abre `http://127.0.0.1:3101`. No ejecutes dos servidores sobre el mismo puerto.

## Configuración adaptable y ejemplo concreto

En una aplicación de venta de útiles, cambia `ejemplos/panel-administrativo/server/commerce.js`:

```js
const configureCommerce = commerceRoutes({
  store, fileService, resolvePermissions,
  products: [
    { id: 'libreta-a5', name: 'Libreta A5', unitPriceCents: 1500 },
    { id: 'estuche', name: 'Estuche', unitPriceCents: 2200 }
  ],
  currency: 'PEN', methods: ['cash', 'yape']
});
const app = createPanelApp({ database, fileService, resolvePermissions, configureCommerce });
```

Los precios son enteros en unidades menores de moneda y nunca vienen del cliente. Límites actuales: 30 líneas, cantidades de 1 a 99, productos sin repetir y total hasta 2 000 000 000 céntimos. La configuración se valida al construir el servicio. Un cambio de precio no altera pedidos existentes. La configuración comercial es código del servidor; marca/menú/colores están en `src/config.jsx`, etiquetas en `src/services/commerceService.js`. La demo no muestra cuentas de cobro reales: añade instrucciones comerciales propias en la aplicación destino.

`resolvePermissions(user)` debe consultar permisos de confianza del servidor. `orders:manage` permite administrar pedidos; `payments:review` permite consultar/revisar pagos y leer sus comprobantes; ambos requieren `panel:access`. `files:manage` muestra la sección genérica de archivos del panel, que conserva la propiedad individual. Las rutas de carga de comprobantes están disponibles a clientes autenticados. El registro de usuarios no concede permisos administrativos. Para reutilizar el panel, el ejemplo muestra revisión junto al pedido: concede ambos permisos al revisor que necesite esa pantalla.

## PostgreSQL y migraciones

Conserva las migraciones 001 (usuarios) y 002 (archivos); añade los modelos `CommerceOrder`, `ManualPayment` y relaciones del esquema de usuarios, junto con `202609210003_orders_payments/migration.sql`. La 003 es aditiva: no modifica filas anteriores. Añade claves foráneas, comprobaciones de estados/importes y un índice parcial que permite un solo pago no rechazado por pedido. Ese índice está en SQL porque no se representa en este esquema Prisma. No reemplaces `migrate deploy` por `db push`.

```powershell
# Solo la base local aislada definida en compose.yaml y .env.example
docker compose up -d --wait
npm run db:migrate
npm run db:generate
npm run build:panel
npm run start:orders:db
```

`DATABASE_URL` debe cumplir la validación existente: PostgreSQL local, puerto 55432, base `base_usuarios_dev`, usuario `acceso_dev`. La entrada persistente `server/persistent.js` no crea cuentas; usa `/api/auth/register` del módulo de usuarios para cuentas ficticias. Por ejemplo, con el servidor iniciado:

```powershell
$body = @{ name='Cliente'; lastName='Local'; email='cliente@example.test'; password='EjemploLocal2026!' } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:3101/api/auth/register -Method Post -ContentType 'application/json' -Headers @{ Origin='http://127.0.0.1:3101' } -Body $body
```

Registra otra cuenta ficticia para administración, conserva su `user.id`, añade `COMMERCE_ADMIN_IDS=<uuid>` a `.env` y reinicia `start:orders:db`. Separa varios UUID con comas. Esa variable solo pertenece al ejemplo local; una aplicación destino debe resolver sus concesiones desde su propio sistema. Los bytes persistentes van a `.local/commerce-files`. La clave temporal de archivos se genera al arrancar: los enlaces caducan al reiniciar, los archivos se conservan. Para una clave estable utiliza la opción `signingKey` del servicio de archivos, sin versionar su valor.

La composición persistente es:

```js
const store = createPrismaCommerceStore(database);
const repository = protectReceiptRepository(createPrismaFileRepository(database), store);
const fileService = createFileService({ repository, storage });
```

No omitas `protectReceiptRepository`: serializa borrado y asociación de comprobantes. Las transacciones bloquean primero el pedido y después el archivo; cada operación de revisión y transición vuelve a consultar el estado. El esquema impide eliminar físicamente un archivo referenciado. Usa el servicio para mutaciones; SQL directo debe respetar las mismas reglas. El adaptador de memoria se limita a demo/pruebas, nunca a persistencia real.

## Contratos HTTP

Todas las rutas requieren sesión; mutaciones requieren JSON y origen admitido, salvo la carga de bytes del módulo de archivos. No envíes propietario, precio, moneda ni total al crear un pedido: se rechazan campos adicionales.

| Operación | Ruta / cuerpo |
|---|---|
| Productos de ejemplo | `GET /api/orders/products` |
| Crear | `POST /api/orders` con `{"items":[{"productId":"notebook","quantity":2}]}` |
| Propios / detalle | `GET /api/orders?offset=0`, `GET /api/orders/:id` |
| Administración / detalle | `GET /api/orders/admin?offset=0`, `GET /api/orders/admin/:id` |
| Transición | `PATCH /api/orders/admin/:id/status` con `{"status":"accepted"}` |
| Métodos | `GET /api/payments/methods` |
| Pago efectivo | `POST /api/payments/:orderId` con `{"method":"cash"}` |
| Pago manual | misma ruta, `{"method":"plin","proofFileId":"uuid de archivo privado propio"}` |
| Historial | `GET /api/payments/:orderId`, o `/api/payments/admin/:orderId` |
| Revisar | `PATCH /api/payments/admin/:orderId/:paymentId` con `{"status":"verified"}` o `{"status":"rejected","reason":"Motivo"}` |
| Comprobante | `GET /api/payments/:orderId/:paymentId/proof`, o `/api/payments/admin/:orderId/:paymentId/proof` |

Listas de pedidos: 50 por página. Pedido ajeno: 404; falta de permiso administrativo: 403; transición inválida: 409; datos inválidos: 400. Errores usan el contrato de usuarios `{error:{code,message}}`. La carga, MIME, tamaño y almacenamiento se configuran en archivos. La demo permite también `.txt` para usar un comprobante local legible; limita `allowedTypes` a tus formatos al incorporar el módulo.

## Frontend y verificaciones

`src/app/PanelApp.jsx` compone sesión y vistas; `src/components/OrdersPanel.jsx` maneja pedidos; `PaymentsPanel.jsx` maneja pagos. Las llamadas HTTP están en `src/services/commerceService.js`, reutilizando servicios de autenticación y archivos. Los estilos de dominio están en `src/styles/commerce.css`, sobre los tokens/colores existentes. La lista tiene tabla en escritorio y tarjetas en móvil con las mismas acciones. No se añade router ni carga diferida para estas dos pantallas pequeñas.

`npm run test:orders`: cuatro pruebas HTTP aprobadas, con autenticación y almacenamiento local reales y repositorios en memoria. Cubre total/precio manipulado, comprobante/revisión, privacidad y permisos, transición inválida. `npm run test:panel`: 2/2 por cambios en su composición. `npm run build:panel`: aprobado. No se ejecutaron suites completas ni pruebas anteriores de usuarios/archivos.

PostgreSQL no estaba disponible en 127.0.0.1:55432: migración, restricciones y concurrencia del adaptador Prisma aún no verificadas en base real. La revisión visual en navegador y los recorridos adicionales de efectivo/rechazo quedan pendientes; no se amplió el alcance de pruebas solicitado. La compilación no certifica el aspecto visual.

## Destinatarios múltiples

`PaymentRecipient` guarda nombre, teléfono Yape, titular y QR privado. `RecipientMember` define `manage` y `review` por usuario; el servidor exige además `panel:access`, y nunca acepta esos permisos desde el cliente. `GET/PATCH /api/payments/recipients` permite consultar o cambiar configuraciones autorizadas.

El módulo de origen crea una `PaymentOperation` internamente con `openPaymentOperation`. El cliente solo ve la operación ya asociada. Se copia `recipientId`, pagador, importe, moneda y las instrucciones vigentes (incluido el QR) al abrirla. El cambio posterior del destinatario no reescribe esa copia. Para otro dominio, por ejemplo inscripciones, use `sourceType: 'registration'` y su identificador estable; el resultado se recibe en `PaymentResult` y `onResult(tx, result)` permite actualizar la entidad de origen dentro de la misma transacción. No se agregaron eventos ni inscripciones.

La tienda y el organizador ficticios se aíslan por `recipient_members`; un revisor de la tienda recibe 403 al consultar o revisar una operación del organizador. La revisión es idempotente: repetir exactamente la decisión aprobada devuelve el mismo pago y no crea otro `PaymentResult`; decisiones distintas sobre un pago terminal son rechazadas. QR y comprobantes son archivos privados y no se pueden borrar mientras estén referenciados.
