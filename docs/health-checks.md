# Comprobaciones de disponibilidad

- `GET /api/ping`: devuelve `200` y `{"status":"ok","service":"invictus-api"}` sin consultar la base de datos. Usar para las llamadas de cron-job.org destinadas a mantener activa la API.
- `GET /api/health`: comprueba la base de datos con `SELECT 1` antes de devolver `200` y `{"status":"ok"}`. Usar para comprobar la disponibilidad conjunta de la API y la base de datos.

Ambas respuestas llevan `Cache-Control: no-store`. El ping solo responde después de que el servidor haya arrancado: el proceso sigue conectándose a la base de datos durante su inicio.

Después de desplegar, configurar cron-job.org con método GET y URL `https://invictus-api-rdqu.onrender.com/api/ping`, conservando el horario acordado. Este cambio separa las comprobaciones; no garantiza resolver los errores de enrutamiento `502` con `x-render-routing: no-deploy` observados durante el despertar en Render.
