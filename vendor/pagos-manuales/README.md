# Pagos manuales

**Paso 3:** disponible como paquete privado `@base/pagos-manuales` con dependencias declaradas. El adaptador de pedidos importa su entrada pública; conserva aislamiento por destinatario. Ver [paquetes y configuración](../../docs/modulos-independientes.md).

Servicio y router ESM: `src/index.js`. Registra efectivo (`pending`) o Yape/Plin con comprobante privado (`pending_review`). Un administrador con `payments:review` + `panel:access` verifica o rechaza; el rechazo requiere motivo. Guarda quién revisó y cuándo. No procesa transferencias reales.

Conexión explícita con pedidos: `orderId`, propietario, importe/moneda y unidad de trabajo. Comparte sus comprobaciones de propiedad/permiso; no modifica estados del pedido. Cada intento rechazado se conserva y permite otro intento. Solo un intento pendiente o verificado por pedido; los pagos verificados son terminales. El pedido cancelado impide registro y revisión; completado impide nuevos pagos, pero admite revisar uno ya pendiente.

Comprobantes: carga mediante archivos, sin duplicar almacenamiento ni validación. Solo admite un archivo privado propio no usado. No permite borrarlo una vez asociado, incluso después de rechazo. La ruta administrativa comprueba `payments:review` y transmite los bytes con el servicio existente; no concede acceso global a archivos ajenos. La firma interna no se entrega al administrador ni al navegador.

Consulta la [guía de incorporación](../pedidos-pagos/README.md). El alcance no incluye reembolsos, pagos parciales, conciliación bancaria, eliminación de registros o pasarelas.
