import { runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
import { RegistrationError } from './errors.js';
const view = row => row && ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
function data(r, Prisma) {
  return { status: r.status, paymentInstructionsSnapshot: r.paymentInstructionsSnapshot ?? Prisma.DbNull,
    proofFileId: r.proofFileId ?? null, participationCode: r.participationCode ?? null,
    participationQrDataUrl: r.participationQrDataUrl ?? null, profileId: r.profileId ?? null };
}
// eventReader must use the same transaction when coordinated by the caller.
export function createPrismaRegistrationStore(database, { eventReader, Prisma, coordinated = false } = {}) {
  if (!eventReader?.get) throw new TypeError('Se requiere eventReader.get del store de eventos');
  if (!Prisma?.DbNull) throw new TypeError('Se requiere el namespace Prisma del mismo cliente generado (DbNull)');
  async function guard(tx,eventId) { if(!coordinated&&tx.eventRegistrationConfig&&await tx.eventRegistrationConfig.findUnique({where:{eventId}}))throw new RegistrationError('Usa el coordinador transaccional',409,'COORDINATOR_REQUIRED'); }
  return { events: eventReader, registrations: {
    async create(r) { return runCoordinated(database, async tx => { await guard(tx,r.eventId); await assertLiveFiles(tx,[r.proofFileId]); return view(await tx.eventRegistration.create({ data: { id: r.id, eventId: r.eventId, userId: r.userId,
      ...data(r, Prisma), createdAt: r.createdAt ? new Date(r.createdAt) : undefined } })); }); },
    async get(id) { return view(await database.eventRegistration.findUnique({ where: { id } })); },
    async update(id, r) { return runCoordinated(database, async tx => { const current=await tx.eventRegistration.findUnique({where:{id}}); await guard(tx,current?.eventId); await assertLiveFiles(tx,[r.proofFileId]); return view(await tx.eventRegistration.update({ where: { id }, data: data(r, Prisma) })); }); },
    async list() { return (await database.eventRegistration.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(view); },
    // Mirrors the existing SQL uniqueness: a cancelled row still owns this pair.
    async findByEventUser(eventId, userId) { return view(await database.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId } } })); }
  } };
}
