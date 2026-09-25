import { z } from 'zod';
import { AppError } from '@base/usuarios-acceso';

const uuid = z.string().uuid();
const role = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
const optionalText = max => z.string().trim().max(max).nullable().transform(v => v || null).optional();
const input = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  logoFileId: uuid.nullable().optional(),
  contactName: optionalText(120), phone: optionalText(40), whatsapp: optionalText(40),
  email: z.union([z.literal(''), z.string().trim().email().max(254), z.null()]).transform(v => v ? v.toLowerCase() : null).optional(),
}).strict();
const pageInput = z.coerce.number().int().min(0).max(100000).default(0);
const missing = () => new AppError('Team no disponible', 404, 'TEAM_NOT_FOUND');
const memberSelect = { id: true, userId: true, role: true, joinedAt: true, user: { select: { name: true, lastName: true } } };
const dto = (team, membership) => ({ ...team, role: membership.role, capabilities: {
  edit: team.active && ['OWNER', 'ADMIN'].includes(membership.role),
  members: team.active && membership.role === 'OWNER',
} });

export function createTeamService({ database: db, files }) {
  async function access(tx, actor, teamId, allowed) {
    if (!actor?.id) throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
    uuid.parse(teamId);
    const membership = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: actor.id } } });
    if (!membership) throw missing();
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (allowed && (!team.active || !allowed.includes(membership.role)))
      throw new AppError('No tienes permiso para esta acción en el Team', 403, 'TEAM_FORBIDDEN');
    return { team, membership };
  }
  async function mutate(actor, teamId, allowed, action) {
    uuid.parse(teamId);
    return db.$transaction(async tx => {
      // All membership changes serialize on this row, including authorization rechecks.
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId}::uuid FOR UPDATE`;
      const context = await access(tx, actor, teamId, allowed);
      return action(tx, context);
    });
  }
  async function logo(actor, data, previous) {
    if (data.logoFileId && data.logoFileId !== previous)
      await files.assertOwned(data.logoFileId, actor.id, { visibility: 'public', image: true });
  }
  async function targetMember(tx, teamId, id) {
    uuid.parse(id);
    const member = await tx.teamMember.findFirst({ where: { id, teamId } });
    if (!member) throw new AppError('Miembro no disponible', 404, 'MEMBER_NOT_FOUND');
    return member;
  }
  async function protectOwner(tx, teamId, member, nextRole) {
    if (member.role === 'OWNER' && nextRole !== 'OWNER' &&
      await tx.teamMember.count({ where: { teamId, role: 'OWNER' } }) <= 1)
      throw new AppError('El Team debe conservar al menos un propietario. Asigna otro antes de continuar.', 409, 'LAST_OWNER');
  }
  return {
    async list(actor, offset, forEvents = false) {
      const skip = pageInput.parse(offset);
      const rows = await db.teamMember.findMany({ where: { userId: actor.id, ...(forEvents ? { role: { in: ['OWNER', 'ADMIN'] }, team: { active: true } } : {}) }, include: { team: true }, orderBy: [{ joinedAt: 'desc' }, { id: 'asc' }], skip, take: 21 });
      return { items: rows.slice(0, 20).map(m => dto(m.team, m)), nextOffset: rows.length > 20 ? skip + 20 : null };
    },
    async create(actor, raw) {
      const data = input.parse(raw);
      await logo(actor, data);
      return db.$transaction(async tx => {
        const team = await tx.team.create({ data });
        const membership = await tx.teamMember.create({ data: { teamId: team.id, userId: actor.id, role: 'OWNER' } });
        return dto(team, membership);
      });
    },
    async get(actor, id) { const { team, membership } = await access(db, actor, id); return dto(team, membership); },
    async update(actor, id, raw) {
      const data = input.partial().parse(raw);
      return mutate(actor, id, ['OWNER', 'ADMIN'], async (tx, { team, membership }) => {
        await logo(actor, data, team.logoFileId);
        return dto(await tx.team.update({ where: { id }, data }), membership);
      });
    },
    async members(actor, id, offset) {
      await access(db, actor, id);
      const skip = pageInput.parse(offset);
      const rows = await db.teamMember.findMany({ where: { teamId: id }, select: memberSelect, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }], skip, take: 21 });
      return { items: rows.slice(0, 20), nextOffset: rows.length > 20 ? skip + 20 : null };
    },
    async add(actor, id, raw) {
      const data = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), role: role.default('MEMBER') }).strict().parse(raw);
      return mutate(actor, id, ['OWNER'], async tx => {
        const user = await tx.user.findUnique({ where: { email: data.email }, select: { id: true, status: true } });
        if (!user || user.status !== 'ACTIVE') throw new AppError('No se puede agregar esa cuenta. Verifica el correo y que esté registrada y activa.', 400, 'MEMBER_UNAVAILABLE');
        if (await tx.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId: user.id } } }))
          throw new AppError('La persona ya pertenece al Team', 409, 'MEMBER_EXISTS');
        return tx.teamMember.create({ data: { teamId: id, userId: user.id, role: data.role }, select: memberSelect });
      });
    },
    async changeRole(actor, id, memberId, raw) {
      const data = z.object({ role }).strict().parse(raw);
      return mutate(actor, id, ['OWNER'], async tx => {
        const member = await targetMember(tx, id, memberId);
        await protectOwner(tx, id, member, data.role);
        return tx.teamMember.update({ where: { id: member.id }, data, select: memberSelect });
      });
    },
    async remove(actor, id, memberId) {
      return mutate(actor, id, ['OWNER'], async tx => {
        const member = await targetMember(tx, id, memberId);
        await protectOwner(tx, id, member, null);
        await tx.teamMember.delete({ where: { id: member.id } });
      });
    },
  };
}
