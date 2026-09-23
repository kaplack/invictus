import { AppError } from '../http/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { createSessionToken, hashSessionToken } from './session-token.js';

const RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_MS = 15 * 60 * 1000;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function createAuthService({ database, sessionDays = 7 } = {}) {
  if (!database) throw new TypeError('Se requiere un cliente Prisma');
  if (!Number.isFinite(sessionDays) || sessionDays < 2 || sessionDays > 30) {
    throw new TypeError('sessionDays debe estar entre 2 y 30');
  }
  const sessionDurationMs = sessionDays * 24 * 60 * 60 * 1000;

  async function createSession(userId, connection = database) {
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionDurationMs);
    await connection.session.create({
      data: { userId, tokenHash: hashSessionToken(token), expiresAt },
    });
    return { token, expiresAt };
  }

  return {
    async register({ name, lastName, email, password }) {
      const normalizedEmail = normalizeEmail(email);
      const existingUser = await database.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) throw new AppError('El correo ya está registrado', 409, 'EMAIL_IN_USE');

      const passwordHash = await hashPassword(password);
      try {
        return await database.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: name.trim(),
              lastName: lastName.trim(),
              email: normalizedEmail,
              passwordHash,
            },
          });
          const session = await createSession(user.id, tx);
          return { user: publicUser(user), ...session };
        });
      } catch (error) {
        if (error.code === 'P2002') {
          throw new AppError('El correo ya está registrado', 409, 'EMAIL_IN_USE');
        }
        throw error;
      }
    },

    async login({ email, password }) {
      const user = await database.user.findUnique({ where: { email: normalizeEmail(email) } });
      const validPassword = user && (await verifyPassword(user.passwordHash, password));
      if (!user || !validPassword) {
        throw new AppError('Correo o contraseña incorrectos', 401, 'INVALID_CREDENTIALS');
      }
      if (user.status === 'SUSPENDED') {
        throw new AppError('Esta cuenta está suspendida', 403, 'ACCOUNT_SUSPENDED');
      }
      const session = await createSession(user.id);
      return { user: publicUser(user), ...session };
    },

    async authenticate(token) {
      if (!token) return null;
      const now = new Date();
      const session = await database.session.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        include: { user: true },
      });
      if (!session || session.revokedAt || session.expiresAt <= now) return null;
      if (session.user.status === 'SUSPENDED') {
        await database.session.update({ where: { id: session.id }, data: { revokedAt: now } });
        return null;
      }

      let rotatedToken = null;
      let expiresAt = session.expiresAt;
      if (session.expiresAt.getTime() - now.getTime() <= RENEWAL_WINDOW_MS) {
        rotatedToken = createSessionToken();
        expiresAt = new Date(now.getTime() + sessionDurationMs);
        await database.session.update({
          where: { id: session.id },
          data: { tokenHash: hashSessionToken(rotatedToken), expiresAt, lastUsedAt: now },
        });
      } else if (now.getTime() - session.lastUsedAt.getTime() >= ACTIVITY_UPDATE_MS) {
        await database.session.update({ where: { id: session.id }, data: { lastUsedAt: now } });
      }

      return { user: publicUser(session.user), rotatedToken, expiresAt };
    },

    async logout(token) {
      if (!token) return;
      await database.session.updateMany({
        where: { tokenHash: hashSessionToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },
  };
}
