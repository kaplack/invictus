import { AppError } from '@base/usuarios-acceso';
export const sportsInclude = {select:{isPrimary:true,discipline:{select:{id:true,code:true,name:true,active:true}}},orderBy:{discipline:{name:'asc'}}};
export const sportsView = rows => (rows || []).map(row=>({...row.discipline,isPrimary:row.isPrimary}));
export async function saveSports(tx,profileId,input) {
 const ids=input.map(row=>row.disciplineId);
 const [catalog,existing]=await Promise.all([
  tx.discipline.findMany({where:{id:{in:ids}},select:{id:true,active:true}}),
  tx.participantDiscipline.findMany({where:{participantProfileId:profileId},select:{disciplineId:true}})
 ]);
 if(catalog.length!==ids.length || catalog.some(row=>!row.active && !existing.some(item=>item.disciplineId===row.id)))
  throw new AppError('Selecciona deportes activos del catálogo.',400,'INVALID_DISCIPLINES');
 await tx.participantDiscipline.deleteMany({where:{participantProfileId:profileId}});
 if(input.length)await tx.participantDiscipline.createMany({data:input.map(row=>({...row,participantProfileId:profileId}))});
}
