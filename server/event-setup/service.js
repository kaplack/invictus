import {personalLifecycle} from './lifecycle.js';
import { randomUUID } from 'node:crypto';
import { AppError } from '@base/usuarios-acceso';
import { runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
import { lockManagedEvent, requireEventManager, requireTeamManager } from '../teams/event-access.js';
import { categoryInput, paymentMethodInput, draftPersonalMethodInput, methodSelectionInput, idInput } from './validation.js';

export const methodSummary = { id: true, teamId: true, eventId: true, type: true, label: true, currency: true, active: true };
const conflict = message => new AppError(message, 409, 'SETUP_CONFLICT');
const parse = (schema, input) => { const result = schema.safeParse(input); if (!result.success) throw new AppError(result.error.issues[0].message, 400, 'INVALID_INPUT'); return result.data; };
export const setupEditable = event => (event.teamId || !personalLifecycle(event).started) && event.status === 'DRAFT' && ['DRAFT', 'CHANGES_REQUESTED'].includes(event.reviewStatus);

export async function saveEventDiscipline(tx, event, disciplineId) {
  if (disciplineId === undefined || disciplineId === event.disciplineId) return;
  if (!setupEditable(event)) throw conflict('La disciplina solo se cambia en un borrador editable');
  if (await tx.eventRegistration.count({ where: { eventId: event.id } })) throw conflict('La disciplina queda fija tras la primera inscripción');
  if (disciplineId !== null) {
    idInput.parse(disciplineId);
    if (!await tx.discipline.findFirst({ where: { id: disciplineId, active: true } })) throw new AppError('Disciplina no disponible', 400, 'INVALID_DISCIPLINE');
  }
  await tx.event.update({ where: { id: event.id }, data: { disciplineId } });
}

export function assertEventLogisticsReady(event) {
 if(event.meetingAt&&event.startsAt){
  const day=value=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:event.timeZone||'America/Lima'}).format(new Date(value));
  if(day(event.meetingAt)!==day(event.startsAt))throw conflict('La concentración y la salida deben compartir la fecha del evento');
 }
 if(event.meetingAt&&event.startsAt&&new Date(event.meetingAt)>new Date(event.startsAt))throw conflict('La concentración debe ser antes o al inicio del evento');
 if(event.kitEnabled&&(!event.kitDateFrom||!event.kitDateTo||!event.kitTimeFrom||!event.kitTimeTo||!event.kitVenue?.trim()))throw conflict('Completa fechas, horario diario y lugar de entrega de kits');
}
export async function assertEventSetupReady(tx, event) {
 assertEventLogisticsReady(event);
  const categories = await tx.eventCategory.findMany({ where: { eventId: event.id } });
  if (!categories.length) return; // Historical free enrollment is unchanged.
  const active = categories.filter(c => c.active);
  if (!active.length) throw conflict('Activa al menos una categoría');
  if (!event.disciplineId || !await tx.discipline.findFirst({ where: { id: event.disciplineId, active: true } })) throw conflict('Selecciona una disciplina activa para el evento');
  const methods = await tx.eventPaymentMethod.findMany({ where: { eventId: event.id, method: { active: true } }, include: { method: true } });
  for (const category of active) if (category.priceCents > 0 && !methods.some(m => m.method.currency === category.currency))
    throw conflict(`Habilita un método de pago en ${category.currency} para ${category.name}`);
}

export function createEventSetupService({ database: db, files }) {
  async function eventAccess(actor, id) {
    idInput.parse(id);
    const event = await db.event.findUnique({ where: { id } });
    if (!event) throw new AppError('Evento no encontrado', 404, 'NOT_FOUND');
    // Global administration reads the publication proposal; it cannot change Team configuration.
    if (actor.role !== 'ADMIN') await requireEventManager(db, actor, event);
    return event;
  }
  async function ownerAccess(tx, actor, teamId) {
    const team = await requireTeamManager(tx, actor, teamId, true);
    const member = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: actor.id } } });
    if (member.role !== 'OWNER') throw new AppError('Solo los propietarios configuran métodos de pago', 403, 'TEAM_FORBIDDEN');
    return team;
  }
  async function editableEvent(tx, actor, eventId) {
    const event = await lockManagedEvent(tx, actor, eventId);
    if(event.mode==='INFORMATIONAL') throw conflict('Los eventos informativos no reciben inscripciones');
    if (!setupEditable(event)) throw conflict('Solo puedes configurar un borrador o un evento devuelto con observaciones');
    if (await tx.eventRegistration.count({ where: { eventId } })) throw conflict('La configuración queda fija tras la primera inscripción');
    return event;
  }
  return {
    disciplines: () => db.discipline.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
    async get(actor, id) {
      const event = await eventAccess(actor, id);
      let canManage = true;
      try { await requireEventManager(db, actor, event); } catch (error) { if (![403, 404].includes(error.status)) throw error; canManage = false; }
      const [categories, selected, available, registrations] = await Promise.all([
        db.eventCategory.findMany({ where: { eventId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
        db.eventPaymentMethod.findMany({ where: { eventId: id }, include: { method: { select: methodSummary } } }),
        event.teamId ? db.teamPaymentMethod.findMany({ where: { teamId: event.teamId }, select: methodSummary, orderBy: { createdAt: 'asc' } }) : canManage ? db.teamPaymentMethod.findMany({where:{eventId:id},orderBy:{createdAt:'asc'}}) : [],
        db.eventRegistration.count({ where: { eventId: id } }),
      ]);
      // A moderator only sees methods selected for this proposal, not the Team's full inventory.
      return { eventId: id, teamId: event.teamId, disciplineId: event.disciplineId, categories,
        methodIds: selected.map(m => m.methodId), methods: canManage ? available : selected.map(m => m.method),
        hasRegistrations: registrations>0, editable: event.mode!=='INFORMATIONAL' && canManage && setupEditable(event) && registrations === 0 };
    },
    async category(actor, eventId, categoryId, raw) {
      const data = parse(categoryInput, raw);
      if (categoryId) idInput.parse(categoryId);
      return runCoordinated(db, async tx => {
        const event=await editableEvent(tx, actor, eventId);
        if(!event.teamId && data.currency!=='PEN') throw new AppError('Las categorías personales utilizan soles',400,'INVALID_CURRENCY');
        if (categoryId && !await tx.eventCategory.findFirst({ where: { id: categoryId, eventId } })) throw new AppError('Categoría no disponible', 404, 'CATEGORY_NOT_FOUND');
        if (await tx.eventCategory.findFirst({ where: { eventId, name: { equals: data.name, mode: 'insensitive' }, ...(categoryId ? { id: { not: categoryId } } : {}) } })) throw conflict('Ya existe una categoría con ese nombre en el evento');
        if (!categoryId && await tx.eventCategory.count({ where: { eventId } }) >= 100) throw conflict('El evento alcanzó el límite de 100 categorías');
        return categoryId ? tx.eventCategory.update({ where: { id: categoryId }, data }) : tx.eventCategory.create({ data: { ...data, eventId } });
      });
    },
    async selectMethods(actor, eventId, raw) {
      const { methodIds } = parse(methodSelectionInput, raw);
      return runCoordinated(db, async tx => {
        const event = await editableEvent(tx, actor, eventId);
        if (await tx.teamPaymentMethod.count({ where: { id: { in: methodIds }, ...(event.teamId?{teamId:event.teamId}:{eventId:event.id,teamId:null}), active: true } }) !== methodIds.length)
          throw new AppError('Selecciona únicamente métodos activos de este organizador', 400, 'INVALID_PAYMENT_METHOD');
        await tx.eventPaymentMethod.deleteMany({ where: { eventId } });
        if (methodIds.length) await tx.eventPaymentMethod.createMany({ data: methodIds.map(methodId => ({ eventId, methodId, teamId: event.teamId })) });
        return { methodIds };
      });
    },
    async personalMethod(actor,eventId,methodId,raw) {
      const data=parse(raw.active===false?draftPersonalMethodInput:paymentMethodInput,raw);
      if(!['YAPE','PLIN'].includes(data.type))throw new AppError('Selecciona Yape o Plin',400,'INVALID_PAYMENT_METHOD');
      if(methodId)idInput.parse(methodId);
      return runCoordinated(db,async tx=>{
        const event=await editableEvent(tx,actor,eventId);
        if(event.teamId)throw conflict('Configura las cuentas desde el Team');
        const previous=methodId?await tx.teamPaymentMethod.findFirst({where:{id:methodId,eventId,teamId:null}}):null;
        if(methodId&&!previous)throw new AppError('Método no disponible',404,'METHOD_NOT_FOUND');
        if(previous&&previous.type!==data.type)throw conflict('Crea otro método para cambiar el tipo de pago');
        if(!methodId&&await tx.teamPaymentMethod.count({where:{eventId}})>=100)throw conflict('Límite de métodos alcanzado');
        if(data.qrFileId&&data.qrFileId!==previous?.qrFileId)await files.assertOwned(data.qrFileId,actor.id,{visibility:'private',image:true});
        await assertLiveFiles(tx,[data.qrFileId]);
        const configuration=await tx.eventRegistrationConfig.findUnique({where:{eventId}});
        if(!configuration)throw conflict('Configura el evento primero');
        if(!configuration.paymentRecipientId&&data.active){
          const recipient=await tx.paymentRecipient.create({data:{id:randomUUID(),name:data.holderName}});
          await tx.eventRegistrationConfig.update({where:{eventId},data:{paymentRecipientId:recipient.id}});
        }
        const saved=methodId?await tx.teamPaymentMethod.update({where:{id:methodId},data}):await tx.teamPaymentMethod.create({data:{...data,eventId,teamId:null}});
        if(!methodId&&data.active)await tx.eventPaymentMethod.create({data:{eventId,methodId:saved.id,teamId:null}});
        return saved;
      });
    },
    async methods(actor, teamId) {
      await requireTeamManager(db, actor, teamId);
      return db.teamPaymentMethod.findMany({ where: { teamId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    },
    async method(actor, teamId, methodId, raw) {
      const data = parse(paymentMethodInput, raw);
      if (methodId) idInput.parse(methodId);
      return runCoordinated(db, async tx => {
        const team = await ownerAccess(tx, actor, teamId);
        const previous = methodId ? await tx.teamPaymentMethod.findFirst({ where: { id: methodId, teamId } }) : null;
        if (methodId && !previous) throw new AppError('Método no disponible', 404, 'METHOD_NOT_FOUND');
        if (previous && previous.type !== data.type) throw conflict('Crea otro método para cambiar el tipo de pago');
        if (!methodId && await tx.teamPaymentMethod.count({ where: { teamId } }) >= 100) throw conflict('El Team alcanzó el límite de 100 métodos');
        if (data.qrFileId && data.qrFileId !== previous?.qrFileId) await files.assertOwned(data.qrFileId, actor.id, { visibility: 'private', image: true });
        await assertLiveFiles(tx, [data.qrFileId]);
        if (!team.paymentRecipientId) {
          const recipient = await tx.paymentRecipient.create({ data: { id: randomUUID(), name: team.name } });
          await tx.team.update({ where: { id: teamId }, data: { paymentRecipientId: recipient.id } });
        }
        // Accounts remain references. Future operations must snapshot these instructions when opening payment.
        return methodId ? tx.teamPaymentMethod.update({ where: { id: methodId }, data }) : tx.teamPaymentMethod.create({ data: { ...data, teamId } });
      });
    },
    async qr(actor, teamId, methodId) {
      await requireTeamManager(db, actor, teamId);
      idInput.parse(methodId);
      const method = await db.teamPaymentMethod.findFirst({ where: { id: methodId, teamId }, include: { qr: true } });
      if (!method?.qr || method.qr.deletedAt) throw new AppError('QR no disponible', 404, 'QR_NOT_FOUND');
      const owner = { id: method.qr.ownerId };
      const access = await files.access(method.qr.id, owner);
      return files.content(method.qr.id, owner, Object.fromEntries(new URLSearchParams(access.path.split('?')[1])));
    },
  };
}
