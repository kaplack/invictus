// Profile owns personal names; User's old columns are a fallback only when no Profile exists.
export const profileNamesSelect = { profileUserRows: { take: 1, select: { name: true, lastName: true } } };
export function identityView(row) {
 if(!row)return row;
 const {profileUserRows,...user}=row;
 const profile=profileUserRows?.[0];
 return profile ? {...user,name:profile.name || '',lastName:profile.lastName || ''} : user;
}
export const withUserIdentity=row=>({...row,user:identityView(row.user)});
export async function readProfileIdentity(database,user) {
 const profile=await database.participantProfile.findUnique({where:{userId:user.id},select:{name:true,lastName:true}});
 return profile ? {...user,name:profile.name || '',lastName:profile.lastName || ''} : user;
}
// Adapt the existing service at the application boundary; authentication logic stays reusable.
export function profileAwareAuth(service,database) {
 const result=async response=>response?.user?{...response,user:await readProfileIdentity(database,response.user)}:response;
 return {...service,
  register:async input=>result(await service.register(input)),
  login:async input=>result(await service.login(input)),
  authenticate:async token=>result(await service.authenticate(token))
 };
}
