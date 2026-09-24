# Invictus — continuidad

Actualizado: 2026-09-24.

## Estado actual
2026-09-24: el usuario confirma que Invictus está publicado en Vercel, Render, Neon y AWS S3. Despliegue reportado por el usuario; no verificado en esta revisión.

Etapa 1 completada localmente. Solo existía Invictus_Project_Kickoff.docx, conservado. Git inicializado en main. Paquetes seleccionados incorporados como workspaces locales portables; schema compuesto mediante compositor oficial, historial 001–013 conservado más migración propia 014.

## Decisiones
- El prompt prevalece sobre el kickoff: sin resultados/logros ni inscripciones pagadas.
- USER: participante; ORGANIZER: organizador; ADMIN: administrador. Adaptación interna de ADMIN para contratos SUPERADMIN de eventos, nunca desde entradas del navegador.
- Tienda exclusivamente para existencias físicas. Cotizaciones personalizadas separadas, sin reservar stock ni representar producción.
- Política reserve-until-terminal; cupo inmutable tras primera inscripción.
- Bases localhost:5432/invictus e invictus_test confirmadas y migradas. Las credenciales permanecen solo en .env.\n- Web pública y administrador son entradas Vite separadas: 5173 y 5175, con backend compartido en 3100.\n- Paleta oficial: #D6AE16, #171717, #F7F5EF, #6B7075, #F1D760, #1E3A5F.

## Pendientes
Pendiente de confirmar: creación de la cuenta admin@invictus.pe y ejecución de setup:admin después del registro. La publicación ya fue reportada por el usuario; el estado de GitHub privado queda por confirmar.

### Backlog posterior a la publicación
1. [x] **Mejorar la UX/UI del menú de navegación.** Implementado localmente el 2026-09-24: navegación principal organizada en Eventos, Reconocimientos y A medida; accesos separados al carrito y al menú de cuenta, con Gestión según rol. Hasta 1100 px, menú hamburguesa a la izquierda, logotipo centrado y carrito y usuario a la derecha sin nombre. El desplegable se cierra al navegar, pulsar fuera o usar Escape. Compilación web aprobada; prueba visual manual realizada por el usuario, según su confirmación del 2026-09-24.
2. [ ] **Completar la gestión de eventos para organizadores.** Revisar el flujo y las funcionalidades faltantes, contemplando que actualmente los organizadores cobran a los participantes. Definir cómo representar y gestionar esos cobros en Invictus; el alcance y la modalidad de pago quedan por acordar. La decisión previa de no incluir inscripciones pagadas deberá revisarse antes de implementar cambios relacionados.
3. [ ] **Agregar una sección para registrar teams de usuarios y organizadores.** Pendiente de discusión: definir quién puede crear un team, cómo se administran sus miembros y cómo se relaciona con organizadores y eventos antes de implementar.
4. [ ] **Agregar un dashboard para el administrador.** Definir los indicadores, resúmenes y acciones que necesita el administrador antes de implementar.

## Bloqueos
Antecedente local (2026-09-23): el navegador integrado no arrancó por un fallo del sandbox; la prueba visual alternativa con Edge oculto sí pasó y guardó capturas en .local/screenshots.
2026-09-24: acceso por terminal de Codex restablecido tras corregir el propietario de .git. Navegador integrado pendiente de volver a comprobar.
## Evidencia local — incremento backend
2026-09-23: ambas conexiones verificadas sin divulgar secretos. Las bases confirmadas estaban vacías; se aplicaron 14 migraciones a invictus e invictus_test. Cliente único Prisma 6.19.0 generado.
`npm run test:integration`: 1/1 aprobada. Cookies reales, PostgreSQL, roles, evento publicado, inscripción gratuita confirmada y perfil, último cupo, última unidad, checkout idempotente, pago manual verificado, rechazo de cancelación pagada, cancelación repetida con stock restituido una vez, cotización y archivos privados. No hay identidad HTTP simulada; roles de fixtures provisionados directamente en la base de prueba.
Frontend implementado. `npm run build` compila web y admin. Prueba visual alternativa aprobada: registro/login, evento, producto, inscripción/perfil, carrito/pedido/pago y responsive 390/1440; capturas en .local/screenshots. Paleta oficial incorporada y referencia preservada en docs/brand.

