import { runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
import { EventError } from './errors.js';
const references = e => [e.primaryImageFileId,e.bannerImageFileId,e.routeImageFileId,...(e.routeImages||[]).map(r=>r.fileId),...(e.galleryFileIds||[]),...(e.benefits||[]).map(b=>b.imageFileId)];
const include = { routeImages: {orderBy: [{position: 'asc'}, {id: 'asc'}]}, benefits: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } };
const view = row => row && ({ ...row, startsAt: row.startsAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  routeImages: row.routeImages.map(({id,eventId,position,...route})=>route),
  benefits: row.benefits.map(({ eventId, position, ...benefit }) => benefit) });
function data(e) {
  return { organizerId: e.organizerId, publicSlug: e.publicSlug, title: e.title, description: e.description,
    kitDateFrom:e.kitDateFrom?new Date(e.kitDateFrom):null,kitDateTo:e.kitDateTo?new Date(e.kitDateTo):null,kitTimeFrom:e.kitTimeFrom??null,kitTimeTo:e.kitTimeTo??null,kitInstructions:e.kitInstructions??null,
    competitionConfig:e.competitionConfig??undefined,
    timeLimitMinutes:e.timeLimitMinutes??null,
    meetingAt:e.meetingAt?new Date(e.meetingAt):null,meetingVenue:e.meetingVenue??null,kitEnabled:e.kitEnabled??false,kitStartsAt:e.kitStartsAt?new Date(e.kitStartsAt):null,kitEndsAt:e.kitEndsAt?new Date(e.kitEndsAt):null,kitVenue:e.kitVenue??null,kitAddress:e.kitAddress??null,routeImageFileId:e.routeImageFileId??null,
    type: e.type ?? null, startsAt: e.startsAt ? new Date(e.startsAt) : null, timeZone: e.timeZone, venue: e.venue ?? null,
    virtualUrl: e.virtualUrl ?? null, status: e.status, primaryImageFileId: e.primaryImageFileId ?? null,
    bannerImageFileId: e.bannerImageFileId ?? null, galleryFileIds: e.galleryFileIds ?? [] };
}
const routes = e => (e.routeImages??[]).map((r,position)=>({fileId:r.fileId,title:r.title,description:r.description??null,position}));
const benefits = e => (e.benefits ?? []).map((b, position) => ({ id: b.id, kind: b.kind, name: b.name,
  description: b.description ?? null, imageFileId: b.imageFileId ?? null, condition: b.condition ?? null, position }));
export function createPrismaEventStore(database) {
  return { events: {
    async get(id) { return view(await database.event.findUnique({ where: { id }, include })); },
    async getBySlug(publicSlug) { return view(await database.event.findUnique({ where: { publicSlug }, include })); },
    async list() { return (await database.event.findMany({ include, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(view); },
    async create(e) { return runCoordinated(database, async tx => { await assertLiveFiles(tx, references(e)); return view(await tx.event.create({ data: { id: e.id, ...data(e), createdAt: e.createdAt ? new Date(e.createdAt) : undefined,
      routeImages: {create:routes(e)}, benefits: { create: benefits(e) } }, include })); }); },
    async update(id, e) { return runCoordinated(database, async tx => { await assertLiveFiles(tx, references(e)); const current=await tx.event.findUnique({where:{id}}); if(current&&['CLOSED','FINISHED','CANCELLED'].includes(current.status))throw new EventError('Evento cerrado',409,'IMMUTABLE_STATE'); if(tx.eventRegistration&&['CANCELLED','FINISHED'].includes(e.status)) {
      const blocking=e.status==='CANCELLED'?['PENDING','PENDING_REVIEW','OBSERVED','CONFIRMED','COMPLETED']:['PENDING','PENDING_REVIEW','OBSERVED'];
      if(await tx.eventRegistration.count({where:{eventId:id,status:{in:blocking}}}))throw new EventError('Resuelve las inscripciones antes de cerrar este evento',409,'EVENT_HAS_REGISTRATIONS');
    }
    return view(await tx.event.update({ where: { id }, data: { ...data(e),
      routeImages: {deleteMany:{},create:routes(e)}, benefits: { deleteMany: {}, create: benefits(e) } }, include })); }); }
  } };
}
