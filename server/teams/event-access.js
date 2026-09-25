import { z } from 'zod';
import { AppError } from '@base/usuarios-acceso';

const uuid = z.string().uuid();
export const teamSummary = { id: true, name: true, logoFileId: true };
export const managedEventWhere = actor => ({ OR: [
  { teamId: null, organizerId: actor.id },
  { team: { active: true, members: { some: { userId: actor.id, role: { in: ['OWNER', 'ADMIN'] } } } } },
] });

export async function requireTeamManager(db, actor, teamId, lock = false) {
  uuid.parse(teamId);
  if (lock) await db.$queryRaw`SELECT id FROM teams WHERE id = ${teamId}::uuid FOR UPDATE`;
  const membership = await db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: actor.id } }, include: { team: true } });
  if (!membership) throw new AppError('Team no disponible', 404, 'TEAM_NOT_FOUND');
  if (!membership.team.active || !['OWNER', 'ADMIN'].includes(membership.role))
    throw new AppError('Necesitas ser propietario o administrador de un Team activo', 403, 'TEAM_FORBIDDEN');
  return membership.team;
}

export async function requireEventManager(db, actor, event) {
  if (!actor?.id) throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
  if (event.teamId) return requireTeamManager(db, actor, event.teamId);
  if (event.organizerId !== actor.id && actor.role !== 'ADMIN')
    throw new AppError('No puedes gestionar este evento', 403, 'FORBIDDEN');
}

export async function lockManagedEvent(db, actor, id) {
  uuid.parse(id);
  const event = await db.event.findUnique({ where: { id } });
  if (!event) throw new AppError('Evento no encontrado', 404, 'NOT_FOUND');
  if (event.teamId) await requireTeamManager(db, actor, event.teamId, true);
  await db.$queryRaw`SELECT id FROM events WHERE id = ${id}::uuid FOR UPDATE`;
  const current = await db.event.findUnique({ where: { id } });
  await requireEventManager(db, actor, current);
  return current;
}

export function assertSameTeam(current, teamId) {
  if (teamId !== undefined && teamId !== current.teamId)
    throw new AppError('El Team de un evento no se cambia desde este formulario', 409, 'TEAM_IMMUTABLE');
}
