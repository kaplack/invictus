import { z } from 'zod';
import { AppError } from '@base/usuarios-acceso';
import { runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
const uuid = z.string().uuid();
const role = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
const optionalText = max => z.string().trim().max(max).nullable().transform(v => v || null).optional();
const input = z.object({
  discoverable: z.boolean().optional(),
  joinPolicy: z.enum(['OPEN', 'APPROVAL', 'INVITE']).optional(),
  name: z.string().trim().min(1).max(120),
  disciplineIds: z.array(uuid).max(50).transform(ids => [...new Set(ids)]).optional(),
  description: z.string().trim().max(2000).optional(),
  logoFileId: uuid.nullable().optional(),
  bannerFileId: uuid.nullable().optional(),
  contactName: optionalText(120),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  email: z.union([z.literal(''), z.string().trim().email().max(254), z.null()]).transform(v => v ? v.toLowerCase() : null).optional()
}).strict();
const pageInput = z.coerce.number().int().min(0).max(100000).default(0);
const missing = () => new AppError('Team no disponible', 404, 'TEAM_NOT_FOUND');
const disciplineSelection = { select: { id: true, name: true }, orderBy: { name: 'asc' } };
const publicDto = ({ _count, ...team }) => ({ ...team, memberCount: _count.members });
const memberSelect = {
  id: true,
  userId: true,
  role: true,
  joinedAt: true,
  user: {
    select: {
      name: true,
      lastName: true
    }
  }
};
const dto = (team, membership) => ({
  ...team,
  role: membership.role,
  capabilities: {
    edit: team.active && ['OWNER', 'ADMIN'].includes(membership.role),
    members: team.active && membership.role === 'OWNER'
  }
});
export function createTeamService({
  database: db,
  files
}) {
  async function access(tx, actor, teamId, allowed) {
    if (!actor?.id) throw new AppError('Debes iniciar sesión', 401, 'AUTHENTICATION_REQUIRED');
    uuid.parse(teamId);
    const membership = await tx.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: actor.id
        }
      }
    });
    if (!membership) throw missing();
    const team = await tx.team.findUnique({
      where: {
        id: teamId
      },
      include: { disciplines: disciplineSelection }
    });
    if (allowed && (!team.active || !allowed.includes(membership.role))) throw new AppError('No tienes permiso para esta acción en el Team', 403, 'TEAM_FORBIDDEN');
    return {
      team,
      membership
    };
  }
  async function mutate(actor, teamId, allowed, action) {
    uuid.parse(teamId);
    return runCoordinated(db, async tx => {
      // All membership changes serialize on this row, including authorization rechecks.
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId}::uuid FOR UPDATE`;
      const context = await access(tx, actor, teamId, allowed);
      return action(tx, context);
    });
  }
  async function teamData(tx, raw, creating = false, previous = []) {
    const { disciplineIds, ...data } = raw;
    if (disciplineIds !== undefined) {
      const allowed = await tx.discipline.count({ where: { id: { in: disciplineIds }, OR: [
        { active: true }, { id: { in: previous.map(item => item.id) } }
      ] } });
      if (allowed !== disciplineIds.length) throw new AppError('Selecciona deportes disponibles del catálogo.', 400, 'INVALID_TEAM_DISCIPLINES');
      data.disciplines = { [creating ? 'connect' : 'set']: disciplineIds.map(id => ({ id })) };
    }
    return data;
  }
  async function logo(actor, data, previous) {
    if (data.logoFileId && data.logoFileId !== previous) await files.assertOwned(data.logoFileId, actor.id, {
      visibility: 'public',
      image: true
    });
  }
  async function banner(actor, data) {
    if (!data.bannerFileId) return;
    const file = await files.assertOwned(data.bannerFileId, actor.id, { visibility: 'public', image: true });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.contentType) || file.size > 10 * 1024 * 1024) {
      throw new AppError('El banner debe ser JPG, PNG o WebP y pesar como máximo 10 MB.', 400, 'INVALID_TEAM_BANNER');
    }
  }
  async function targetMember(tx, teamId, id) {
    uuid.parse(id);
    const member = await tx.teamMember.findFirst({
      where: {
        id,
        teamId
      }
    });
    if (!member) throw new AppError('Miembro no disponible', 404, 'MEMBER_NOT_FOUND');
    return member;
  }
  async function protectOwner(tx, teamId, member, nextRole) {
    if (member.role === 'OWNER' && nextRole !== 'OWNER' && (await tx.teamMember.count({
      where: {
        teamId,
        role: 'OWNER'
      }
    })) <= 1) throw new AppError('El Team debe conservar al menos un propietario. Asigna otro antes de continuar.', 409, 'LAST_OWNER');
  }
  async function locked(teamId, action) {
    uuid.parse(teamId);
    return db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId}::uuid FOR UPDATE`;
      const team = await tx.team.findUnique({
        where: {
          id: teamId
        }
      });
      if (!team?.active) throw missing();
      return action(tx, team);
    });
  }
  const publicSelect = {
    id: true,
    name: true,
    description: true,
    logoFileId: true,
    bannerFileId: true,
    disciplines: disciplineSelection,
    _count: { select: { members: true } },
    joinPolicy: true
  };
  return {
    async publicList(query, offset, disciplineId, sort) {
      const skip = pageInput.parse(offset);
      const q = z.string().trim().max(120).parse(query || '');
      const sport = uuid.optional().parse(disciplineId);
      const ordering = z.enum(['name-asc', 'name-desc', 'recent', 'members']).default('name-asc').parse(sort);
      const orders = {
        'name-asc': [{name: 'asc'}, {id: 'asc'}],
        'name-desc': [{name: 'desc'}, {id: 'asc'}],
        recent: [{createdAt: 'desc'}, {id: 'asc'}],
        members: [{members: {_count: 'desc'}}, {name: 'asc'}, {id: 'asc'}],
      };
      const rows = await db.team.findMany({
        where: {active: true, discoverable: true, name: {contains: q, mode: 'insensitive'},
          ...(sport ? {disciplines: {some: {id: sport}}} : {})},
        select: publicSelect, orderBy: orders[ordering], skip, take: 21,
      });
      return {items: rows.slice(0, 20).map(publicDto), nextOffset: rows.length > 20 ? skip + 20 : null};
    },
    async publicGet(id) {
      uuid.parse(id);
      const team = await db.team.findFirst({where: {id, active: true, discoverable: true}, select: publicSelect});
      if (!team) throw missing();
      return publicDto(team);
    },
    async explore(actor, query, offset) {
      const skip = pageInput.parse(offset),
        q = z.string().trim().max(120).parse(query || '');
      const rows = await db.team.findMany({
        where: {
          active: true,
          discoverable: true,
          name: {
            contains: q,
            mode: 'insensitive'
          }
        },
        select: {
          ...publicSelect,
          _count: { select: { members: true, events: { where: { status: 'PUBLISHED' } } } },
          members: {
            where: {
              userId: actor.id
            },
            select: {
              role: true
            }
          },
          admissions: {
            where: {
              userId: actor.id
            },
            select: {
              status: true,
              kind: true
            }
          }
        },
        orderBy: [{
          name: 'asc'
        }, {
          id: 'asc'
        }],
        skip,
        take: 21
      });
      return {
        items: rows.slice(0, 20),
        nextOffset: rows.length > 20 ? skip + 20 : null
      };
    },
    async invitations(actor) {
      return db.teamAdmission.findMany({
        where: {
          userId: actor.id,
          kind: 'INVITE',
          status: 'PENDING',
          team: {
            active: true
          }
        },
        select: {
          id: true,
          team: {
            select: publicSelect
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    },
    async join(actor, id) {
      return locked(id, async (tx, team) => {
        if (!team.discoverable) throw missing();
        if (team.joinPolicy === 'INVITE') throw new AppError('Este Team requiere invitación', 403, 'INVITE_ONLY');
        if (await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: id,
              userId: actor.id
            }
          }
        })) return {
          status: 'ACCEPTED'
        };
        if (team.joinPolicy === 'OPEN') {
          await tx.teamMember.create({
            data: {
              teamId: id,
              userId: actor.id,
              role: 'MEMBER'
            }
          });
          await tx.teamAdmission.updateMany({
            where: {
              teamId: id,
              userId: actor.id
            },
            data: {
              status: 'ACCEPTED'
            }
          });
          return {
            status: 'ACCEPTED'
          };
        }
        return tx.teamAdmission.upsert({
          where: {
            teamId_userId: {
              teamId: id,
              userId: actor.id
            }
          },
          create: {
            teamId: id,
            userId: actor.id,
            kind: 'REQUEST'
          },
          update: {
            kind: 'REQUEST',
            status: 'PENDING',
            createdAt: new Date()
          }
        });
      });
    },
    async invite(actor, id, raw) {
      const email = z.string().trim().email().max(254).parse(raw.email).toLowerCase();
      return mutate(actor, id, ['OWNER'], async tx => {
        const user = await tx.user.findUnique({
          where: {
            email
          }
        });
        if (!user || user.status !== 'ACTIVE') throw new AppError('La cuenta debe estar registrada y activa.', 400, 'ACCOUNT_UNAVAILABLE');
        if (await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: id,
              userId: user.id
            }
          }
        })) throw new AppError('La persona ya pertenece al Team', 409, 'MEMBER_EXISTS');
        await tx.teamAdmission.upsert({
          where: {
            teamId_userId: {
              teamId: id,
              userId: user.id
            }
          },
          create: {
            teamId: id,
            userId: user.id,
            kind: 'INVITE'
          },
          update: {
            kind: 'INVITE',
            status: 'PENDING',
            createdAt: new Date()
          }
        });
        return {
          status: 'PENDING'
        };
      });
    },
    async requests(actor, id) {
      await access(db, actor, id, ['OWNER']);
      return db.teamAdmission.findMany({
        where: {
          teamId: id,
          kind: 'REQUEST',
          status: 'PENDING'
        },
        select: {
          id: true,
          user: {
            select: {
              name: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    },
    async decide(actor, id, admissionId, raw) {
      const accept = z.boolean().parse(raw.accept);
      uuid.parse(admissionId);
      return locked(id, async tx => {
        const admission = await tx.teamAdmission.findFirst({
          where: {
            id: admissionId,
            teamId: id,
            status: 'PENDING'
          }
        });
        if (!admission) throw missing();
        if (admission.kind === 'REQUEST') await access(tx, actor, id, ['OWNER']);else if (admission.userId !== actor.id) throw missing();
        if (accept) {
          const user = await tx.user.findUnique({
            where: {
              id: admission.userId
            }
          });
          if (user.status !== 'ACTIVE') throw new AppError('La cuenta no está activa', 409, 'ACCOUNT_UNAVAILABLE');
          await tx.teamMember.upsert({
            where: {
              teamId_userId: {
                teamId: id,
                userId: admission.userId
              }
            },
            create: {
              teamId: id,
              userId: admission.userId,
              role: 'MEMBER'
            },
            update: {}
          });
        }
        return tx.teamAdmission.update({
          where: {
            id: admission.id
          },
          data: {
            status: accept ? 'ACCEPTED' : 'REJECTED'
          }
        });
      });
    },
    async events(actor, id) {
      const {
        membership
      } = await access(db, actor, id);
      return db.event.findMany({
        where: {
          teamId: id,
          ...(membership.role === 'MEMBER' ? {
            status: 'PUBLISHED'
          } : {})
        },
        select: {
          id: true,
          title: true,
          startsAt: true,
          publicSlug: true,
          status: true
        },
        orderBy: {
          startsAt: 'desc'
        }
      });
    },
    async list(actor, offset, forEvents = false) {
      const skip = pageInput.parse(offset);
      const rows = await db.teamMember.findMany({
        where: {
          userId: actor.id,
          ...(forEvents ? {
            role: {
              in: ['OWNER', 'ADMIN']
            },
            team: {
              active: true
            }
          } : {})
        },
        include: {
          team: { include: { disciplines: disciplineSelection, _count: { select: { members: true, events: { where: { status: 'PUBLISHED' } } } } } }
        },
        orderBy: [{
          joinedAt: 'desc'
        }, {
          id: 'asc'
        }],
        skip,
        take: 21
      });
      return {
        items: rows.slice(0, 20).map(m => dto(m.team, m)),
        nextOffset: rows.length > 20 ? skip + 20 : null
      };
    },
    async create(actor, raw) {
      const data = input.parse(raw);
      return runCoordinated(db, async tx => {
        await logo(actor, data);
        await banner(actor, data);
        await assertLiveFiles(tx, [data.logoFileId, data.bannerFileId]);
        const team = await tx.team.create({
          data: await teamData(tx, data, true),
          include: { disciplines: disciplineSelection }
        });
        const membership = await tx.teamMember.create({
          data: {
            teamId: team.id,
            userId: actor.id,
            role: 'OWNER'
          }
        });
        return dto(team, membership);
      });
    },
    async get(actor, id) {
      const {
        team,
        membership
      } = await access(db, actor, id);
      return dto(team, membership);
    },
    async update(actor, id, raw) {
      const data = input.partial().parse(raw);
      return mutate(actor, id, 'joinPolicy' in data || 'discoverable' in data ? ['OWNER'] : ['OWNER', 'ADMIN'], async (tx, {
        team,
        membership
      }) => {
        await logo(actor, data, team.logoFileId);
        await banner(actor, data);
        await assertLiveFiles(tx, [data.logoFileId, data.bannerFileId]);
        return dto(await tx.team.update({
          where: {
            id
          },
          data: await teamData(tx, data, false, team.disciplines),
          include: { disciplines: disciplineSelection }
        }), membership);
      });
    },
    async members(actor, id, offset) {
      await access(db, actor, id);
      const skip = pageInput.parse(offset);
      const rows = await db.teamMember.findMany({
        where: {
          teamId: id
        },
        select: memberSelect,
        orderBy: [{
          joinedAt: 'asc'
        }, {
          id: 'asc'
        }],
        skip,
        take: 21
      });
      return {
        items: rows.slice(0, 20),
        nextOffset: rows.length > 20 ? skip + 20 : null
      };
    },
    async add(actor, id, raw) {
      const data = z.object({
        email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
        role: role.default('MEMBER')
      }).strict().parse(raw);
      return mutate(actor, id, ['OWNER'], async tx => {
        const user = await tx.user.findUnique({
          where: {
            email: data.email
          },
          select: {
            id: true,
            status: true
          }
        });
        if (!user || user.status !== 'ACTIVE') throw new AppError('No se puede agregar esa cuenta. Verifica el correo y que esté registrada y activa.', 400, 'MEMBER_UNAVAILABLE');
        if (await tx.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: id,
              userId: user.id
            }
          }
        })) throw new AppError('La persona ya pertenece al Team', 409, 'MEMBER_EXISTS');
        return tx.teamMember.create({
          data: {
            teamId: id,
            userId: user.id,
            role: data.role
          },
          select: memberSelect
        });
      });
    },
    async changeRole(actor, id, memberId, raw) {
      const data = z.object({
        role
      }).strict().parse(raw);
      return mutate(actor, id, ['OWNER'], async tx => {
        const member = await targetMember(tx, id, memberId);
        await protectOwner(tx, id, member, data.role);
        return tx.teamMember.update({
          where: {
            id: member.id
          },
          data,
          select: memberSelect
        });
      });
    },
    async remove(actor, id, memberId) {
      return mutate(actor, id, ['OWNER'], async tx => {
        const member = await targetMember(tx, id, memberId);
        await protectOwner(tx, id, member, null);
        await tx.teamMember.delete({
          where: {
            id: member.id
          }
        });
      });
    }
  };
}
