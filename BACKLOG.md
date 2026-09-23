# Invictus — continuidad

Actualizado: 2026-09-23.

## Estado actual
Etapa 1 completada localmente. Solo existía Invictus_Project_Kickoff.docx, conservado. Git inicializado en main. Paquetes seleccionados incorporados como workspaces locales portables; schema compuesto mediante compositor oficial, historial 001–013 conservado más migración propia 014.

## Decisiones
- El prompt prevalece sobre el kickoff: sin resultados/logros ni inscripciones pagadas.
- USER: participante; ORGANIZER: organizador; ADMIN: administrador. Adaptación interna de ADMIN para contratos SUPERADMIN de eventos, nunca desde entradas del navegador.
- Tienda exclusivamente para existencias físicas. Cotizaciones personalizadas separadas, sin reservar stock ni representar producción.
- Política reserve-until-terminal; cupo inmutable tras primera inscripción.
- Bases localhost:5432/invictus e invictus_test confirmadas y migradas. Las credenciales permanecen solo en .env.\n- Web pública y administrador son entradas Vite separadas: 5173 y 5175, con backend compartido en 3100.\n- Paleta oficial: #D6AE16, #171717, #F7F5EF, #6B7075, #F1D760, #1E3A5F.

## Pendientes
Crear la cuenta admin@invictus.pe y ejecutar setup:admin después del registro. GitHub privado y publicación después del corte local; faltan propietario/repositorio y cuentas externas. Ningún servicio externo conectado o verificado.

## Bloqueos
El navegador integrado no arrancó por un fallo del sandbox; la prueba visual alternativa con Edge oculto sí pasó y guardó capturas en .local/screenshots. No se han conectado servicios externos.
## Evidencia local — incremento backend
2026-09-23: ambas conexiones verificadas sin divulgar secretos. Las bases confirmadas estaban vacías; se aplicaron 14 migraciones a invictus e invictus_test. Cliente único Prisma 6.19.0 generado.
`npm run test:integration`: 1/1 aprobada. Cookies reales, PostgreSQL, roles, evento publicado, inscripción gratuita confirmada y perfil, último cupo, última unidad, checkout idempotente, pago manual verificado, rechazo de cancelación pagada, cancelación repetida con stock restituido una vez, cotización y archivos privados. No hay identidad HTTP simulada; roles de fixtures provisionados directamente en la base de prueba.
Frontend implementado. `npm run build` compila web y admin. Prueba visual alternativa aprobada: registro/login, evento, producto, inscripción/perfil, carrito/pedido/pago y responsive 390/1440; capturas en .local/screenshots. Paleta oficial incorporada y referencia preservada en docs/brand.

