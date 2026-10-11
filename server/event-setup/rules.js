import {AppError} from '@base/usuarios-acceso';

export async function assertRulesChangeAllowed(database,previous,next) {
 if(previous.rulesFileId!==next.rulesFileId&&await database.eventRegistration.count({where:{eventId:previous.id}}))
  throw new AppError('No puedes modificar las bases porque el evento ya tiene inscritos',409,'RULES_LOCKED');
}
