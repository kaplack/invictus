# Pedidos

Parte 4: [adaptadores, contratos de uso y límites de integración](../../docs/adaptadores-integracion.md). Los nuevos flujos de cobro requieren cerrar la parte 5 antes de habilitarse.

**Paso 3:** disponible como paquete privado `@base/pedidos` con dependencias declaradas, sin requerir rutas internas del workspace. Ver [paquetes y configuración](../../docs/modulos-independientes.md).

Servicio y router ESM: `src/index.js`. Crea pedidos autenticados, calcula precios en céntimos a partir de productos del servidor y guarda una copia de cada línea. Consulta propia y administración con `orders:manage` + `panel:access`. No administra pagos.

Configuración: `products`, `currency`, `resolvePermissions` y `store`. Estados: `pending → accepted → completed`; se puede cancelar desde `pending` o `accepted`. Completado/cancelado son terminales. Las etiquetas están en el ejemplo, no en los datos. No se exige pago verificado para avanzar: cualquier condición comercial adicional debe incorporarse explícitamente en la aplicación anfitriona.

La [guía conjunta](../pedidos-pagos/README.md) contiene dependencias, contratos, migraciones, instalación y ejemplo concreto. Los routers no instalan sesiones ni errores: reutilizan el middleware del módulo de usuarios. Los productos de ejemplo son configuración, no un catálogo CRUD.
