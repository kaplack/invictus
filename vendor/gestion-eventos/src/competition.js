import {z} from 'zod';
export const modalitiesInput=z.array(z.object({name:z.string().trim().min(1).max(100),description:z.string().trim().max(1000).default('')}).strict()).max(20).refine(rows=>new Set(rows.map(r=>r.name.toLocaleLowerCase('es'))).size===rows.length,'No repitas nombres de modalidades');
export const competitionConfigInput=z.object({genderEnabled:z.boolean(),ageGroupsEnabled:z.boolean(),modalities:modalitiesInput.optional(),ageGroups:z.array(z.object({minAge:z.number().int().min(0).max(120),maxAge:z.number().int().min(0).max(120)}).strict().refine(g=>g.minAge<=g.maxAge,'La edad mínima no puede superar la máxima')).max(30)}).strict().superRefine((v,ctx)=>{
 if(v.ageGroupsEnabled&&!v.ageGroups.length)ctx.addIssue({code:'custom',message:'Agrega al menos un rango de edad'});
 const ranges=[...v.ageGroups].sort((a,b)=>a.minAge-b.minAge);for(let i=1;i<ranges.length;i++)if(ranges[i].minAge<=ranges[i-1].maxAge)ctx.addIssue({code:'custom',message:'Los rangos de edad no pueden superponerse'});
});
