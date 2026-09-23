# Usuarios y acceso

Paquete ESM privado @base/usuarios-acceso extraído de Kasera. Requiere Node 22.12+, Express 5 y un cliente Prisma 6 generado con los modelos User y Session de prisma/schema.prisma.

## Integración

El punto público src/index.js exporta createAuthService, createAuthRouter, createAuthMiddleware, sessionCookieOptions, AppError y los manejadores HTTP. Inyecta el cliente mediante createAuthService({ database, sessionDays: 7 }); no lee variables de entorno ni abre conexiones por su cuenta. El ejemplo server/app.js muestra la composición completa con express.json(), cookie-parser, control de origen y rutas.

Monta el router con { authService, authMiddleware, cookieName, cookieOptions }. requireAuth carga req.user desde PostgreSQL; requireRole(...roles) se usa después de requireAuth. El registro ignora roles enviados por clientes: el esquema asigna USER. Los roles adicionales pertenecen al proyecto consumidor y deben asignarse por un proceso autorizado del servidor.

## Contrato

| Método y ruta relativa | Entrada / resultado |
| --- | --- |
| POST /register | name, lastName, email, password; devuelve 201 { user } y cookie |
| POST /login | email, password; devuelve 200 { user } y cookie |
| POST /logout | revoca la sesión recibida; 204 y eliminación de cookie |
| GET /session | requireAuth; devuelve { user } o 401 |

Usuario público: id, name, lastName, email, role, status. Errores: { error: { code, message, details? } }. Códigos esperados: VALIDATION_ERROR (400), INVALID_CREDENTIALS (401), AUTHENTICATION_REQUIRED (401), ACCOUNT_SUSPENDED/FORBIDDEN (403), EMAIL_IN_USE (409), TOO_MANY_ATTEMPTS (429).

Conserva scrypt con sal aleatoria, token opaco de 32 bytes, hash SHA-256 del token en PostgreSQL, cookie HttpOnly/SameSite=Lax, 20 intentos por IP cada 15 minutos y renovación durante el último día de una sesión. sessionDays admite 2–30 días. Registro y sesión se crean en una transacción. El cierre revoca únicamente la sesión actual; otras sesiones siguen vigentes. La suspensión invalida el acceso, pero este módulo no contiene interfaz de administración.

## Límites

No incluye recuperación de contraseña, correo verificado, MFA ni administración de roles. No tiene tablas, relaciones, reglas de cocina, pedidos, pagos, auditoría comercial o datos de Kasera. No necesita AWS, PostGIS ni los servicios del origen.

La composición del ejemplo es exclusivamente local. Para otro despliegue, el consumidor debe configurar HTTPS/cookies Secure, orígenes permitidos y un almacén compartido para el limitador si hay varias instancias. Las sesiones antiguas no se purgan automáticamente. La renovación conserva el comportamiento del origen: solicitudes concurrentes con el token anterior pueden recibir 401; no se ha añadido coordinación de rotaciones.

Consulta ../../ejemplos/usuarios-acceso/README.md para ejecutar y ../../catalogo/usuarios-acceso.md para procedencia y evidencia.
