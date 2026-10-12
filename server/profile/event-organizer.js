import { profileNamesSelect, identityView } from './identity.js';

export const teamLabel = name => /^team\b/i.test(name.trim()) ? name.trim() : 'Team ' + name.trim();
export async function eventOrganizer(database, event) {
  if (event.team?.name) return teamLabel(event.team.name);
  if (event.publicOrganizerName) return event.publicOrganizerName;
  const user = identityView(await database.user.findUnique({where:{id:event.organizerId},select:{name:true,lastName:true,username:true,...profileNamesSelect}}));
  return [user?.name,user?.lastName].filter(Boolean).join(' ') || (user?.username ? '@'+user.username : '');
}
export async function withEventOrganizer(database, event) {
  return {...event,organizerName:await eventOrganizer(database,event)};
}
