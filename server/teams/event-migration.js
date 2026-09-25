import { z } from 'zod';
import { runCoordinated } from '@base/usuarios-acceso/contracts';

const mappingInput = z.array(z.object({
  eventId: z.string().uuid(), expectedOrganizerId: z.string().uuid(), teamId: z.string().uuid(),
}).strict()).min(1).max(1000).refine(rows => new Set(rows.map(r => r.eventId)).size === rows.length, 'Evento repetido en el mapa');

export async function eventTeamReport(db) {
  const events = await db.event.findMany({ where: { teamId: null }, select: {
    id: true, title: true, source: true, status: true, publicSlug: true, organizerId: true,
    organizer: { select: { name: true, lastName: true, status: true, teamMemberships: {
      where: { role: { in: ['OWNER', 'ADMIN'] }, team: { active: true } },
      select: { role: true, team: { select: { id: true, name: true } } },
    } } },
    _count: { select: { registrationEventRows: true } },
  }, orderBy: { createdAt: 'asc' } });
  return { generatedAt: new Date().toISOString(), unassigned: events.length,
    events: events.map(e => ({ eventId: e.id, title: e.title, source: e.source, status: e.status, publicSlug: e.publicSlug,
      expectedOrganizerId: e.organizerId, organizerName: `${e.organizer.name} ${e.organizer.lastName}`, organizerStatus: e.organizer.status,
      registrations: e._count.registrationEventRows, candidateTeams: e.organizer.teamMemberships.map(m => ({ ...m.team, role: m.role })),
      teamId: null })),
    note: 'Los candidatos no son asignaciones. Preparar un array con eventId, expectedOrganizerId y teamId, revisarlo y simularlo antes de aplicar.' };
}

export async function mapEventTeams(db, raw, { apply = false } = {}) {
  const mapping = mappingInput.parse(raw);
  return runCoordinated(db, async tx => {
    const result = [];
    for (const row of mapping) {
      await tx.$queryRaw`SELECT id FROM teams WHERE id = ${row.teamId}::uuid FOR UPDATE`;
      const team = await tx.team.findUnique({ where: { id: row.teamId } });
      if (!team?.active || !await tx.teamMember.count({ where: { teamId: row.teamId, role: 'OWNER', user: { status: 'ACTIVE' } } }))
        throw new Error(`Team sin propietario activo o no disponible: ${row.teamId}`);
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${row.eventId}::uuid FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: row.eventId } });
      if (!event || event.organizerId !== row.expectedOrganizerId) throw new Error(`Organizador distinto o evento no disponible: ${row.eventId}`);
      if (event.teamId && event.teamId !== row.teamId) throw new Error(`El evento ya pertenece a otro Team: ${row.eventId}`);
      const unchanged = event.teamId === row.teamId && event.createdByUserId !== null;
      if (apply && !unchanged) await tx.event.update({ where: { id: row.eventId }, data: {
        teamId: row.teamId, createdByUserId: event.createdByUserId || event.organizerId,
      } });
      result.push({ eventId: row.eventId, teamId: row.teamId, action: unchanged ? 'unchanged' : apply ? 'assigned' : 'would_assign' });
    }
    return result;
  });
}
