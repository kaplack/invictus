import { api, upload } from './api.js';

export async function saveTeam(team, values, logo) {
  if (logo) values.logoFileId = (await upload(logo, 'public')).id;
  return api('/teams' + (team.id ? '/' + team.id : ''), team.id ? 'PATCH' : 'POST', values);
}
export const addMember = (id, values) => api(`/teams/${id}/members`, 'POST', values);
export const changeMemberRole = (id, memberId, role) => api(`/teams/${id}/members/${memberId}`, 'PATCH', { role });
export const removeMember = (id, memberId) => api(`/teams/${id}/members/${memberId}`, 'DELETE', {});
