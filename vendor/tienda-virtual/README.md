# Módulo 5: tienda virtual

Parte 4: [adaptadores, contratos de uso y límites de integración](../../docs/adaptadores-integracion.md). Los nuevos flujos de cobro requieren cerrar la parte 5 antes de habilitarse.

**Paso 3:** paquete importable por `@base/tienda-virtual`, dependencias explícitas y validación también en edición. Los carritos requieren contexto de propietario; visitantes exigen `authorizeGuestCart` y contexto de sesión del host. Errores HTTP anidados, con `legacyErrors` opcional. Para imágenes configurar `files.assertOwned`. Ver [uso y cambios de compatibilidad](../../docs/modulos-independientes.md); sustituye las instrucciones antiguas de carrito anónimo sin contexto. En la demo, el catálogo sigue público y las operaciones de carrito necesitan la identidad ficticia `x-demo-role: ADMIN`.

**Actualización 22/09/2026:** disponible `createPrismaStore` en `src/prisma-store.js`/`src/index.js`. Usar la [composición y migraciones vigentes](../../docs/persistencia-prisma.md), no el SQL suelto histórico indicado más abajo. Persistencia verificada con PostgreSQL 15 aislado; checkout y reservas de stock siguen pendientes. La demo conserva memoria.

## Propósito y límites

Catálogo público de productos/categorías, variantes configurables, imágenes referenciadas, stock y carrito para visitantes o usuarios. El servidor recalcula precios, cantidades y stock. No implementa checkout completo, pagos nuevos, eventos, inscripciones ni perfiles deportivos.

Origen: adaptación propia basada principalmente en productos/categorías/imágenes/stock y snapshots de pedidos de `D:/webApps/CosaNostra/CosaNostraApp` (referencia consultada en modo lectura). No se modificó el proyecto original ni se copiaron secretos o datos.

## Archivos y dependencias

`src/service.js` contiene las reglas; `src/router.js` expone HTTP; `src/memory-store.js` permite el ejemplo y pruebas; `prisma/migration.sql` es la persistencia aditiva; `ejemplos/tienda-virtual/server.js` es ejecutable; `tests/store.test.js` cubre el mínimo solicitado.

Obligatorias: Node 22+, Express, una identidad/autorización del módulo 1 y un adaptador de persistencia. Para producción, PostgreSQL/Prisma y migración. Opcionales: módulo 2 para cargar/servir imágenes mediante `imageFileId`, módulo 3 para montar las rutas `/admin`, y módulo 4 para convertir `orderPayload` en pedido y enlazar pagos por `orderId`. El módulo de eventos no es dependencia.

## Integración

Montar `createStoreRouter({ service, getUser })` bajo `/api/store`, inyectar un store Prisma con la interfaz de `memory-store`, y aplicar `requireAuth`/`requireRole` del módulo 1 en el panel. El módulo 2 debe resolver `imageFileId` con su política pública. Para pedidos, usar `checkoutSummary(cartId).orderPayload` como entrada; el módulo 4 conserva el precio snapshot y sigue siendo autoridad para estados/pagos.

## Migraciones/configuración

Aplicar `prisma/migration.sql` después de usuarios, sesiones y archivos. No requiere variables nuevas; el consumidor conserva `DATABASE_URL`. En una integración Prisma, mapear tablas `shop_*` a modelos equivalentes y reemplazar solo el adaptador, no las reglas del servicio.

## Ejecutar y probar

Desde la raíz: `node ejemplos/tienda-virtual/server.js` y abrir `http://127.0.0.1:3190`. Crear/gestionar por API con `x-demo-role: ADMIN`; el catálogo no necesita cabecera. Pruebas: `npm run test:store`. Datos ficticios: Polo Kasera en el servidor demo.

Pruebas ejecutadas: las cinco pruebas de `tests/store.test.js` (producto publicado, total servidor, stock excedido, manipulación de precio/stock y autorización). No se ejecutó suite completa ni PostgreSQL: el entorno no tenía servicio local disponible. Queda pendiente probar la migración real, integración con módulos 2–4 y UI administrativa React en una aplicación consumidora.
