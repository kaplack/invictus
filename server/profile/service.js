import { AppError, usernameSchema } from '@base/usuarios-acceso';
import { parseInput, runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
import { createProfileService, createPrismaProfileStore } from '@base/perfil-trayectoria';
import { sportsInclude, sportsView, saveSports } from './sports.js';
import { parseDigital } from './digital.js';
import { athleteProfileInput } from './validation.js';
import { countries, ubigeos, ubigeoByCode } from './location.js';
const extraKeys = ['name','lastName','dateOfBirth','gender','documentType','documentNumber','phone','countryCode','department','province','district','ubigeoCode','bannerFileId','websiteUrl'];
const identityKeys = ['name','lastName','username'];
const own = actor => { if (!actor?.id) throw new AppError('Debes iniciar sesión',401,'UNAUTHENTICATED'); };
const invalid = message => { throw new AppError(message,400,'INVALID_INPUT'); };
const view = (row,username) => {
 if(!row)return null;
 const {participantDisciplines,disciplines:legacyDisciplines,...fields}=row;
 return ({ ...fields, disciplines:sportsView(participantDisciplines), username,
  dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().slice(0,10) : null });
};
export function createAthleteProfileService({database:db,files,registrations,canModerate}) {
  const legacy = connection => createProfileService({store:createPrismaProfileStore(connection),fileService:files,registrationService:registrations,canModerate});
  return {
    async getMine(actor) {
      own(actor);
      const [profile,user] = await Promise.all([
        db.participantProfile.findUnique({where:{userId:actor.id},include:{participantDisciplines:sportsInclude,socialLinks:{select:{platform:true,url:true},orderBy:{platform:'asc'}}}}),
        db.user.findUnique({where:{id:actor.id},select:{username:true}})
      ]);
      return view(profile,user.username);
    },
    locationCatalog(actor) { own(actor); return {countries,ubigeos}; },
    async usernameAvailability(actor,value) {
      own(actor); const username = parseInput(usernameSchema,value);
      const found = await db.user.findUnique({where:{username},select:{id:true}});
      return {available: !found || found.id === actor.id};
    },
    async save(actor,raw) {
      own(actor);
      const submitted = Object.fromEntries(Object.entries(parseInput(athleteProfileInput,parseDigital(raw))).filter(([,value]) => value !== undefined));
      try {
        return await runCoordinated(db,async tx => {
          const user = await tx.user.findUnique({where:{id:actor.id}});
          const current = await tx.participantProfile.findUnique({where:{userId:actor.id}});
          const input = {...submitted};
          if (submitted.socialLinks !== undefined) {
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id}::uuid FOR UPDATE`;
          }
          delete input.socialLinks;
          delete input.disciplines;
          const clearMissing = keys => { for (const key of keys) if (input[key] === undefined) input[key] = null; };
          if (input.countryCode !== undefined && input.countryCode !== current?.countryCode)
            clearMissing(['department','province','district','ubigeoCode']);
          if (input.department !== undefined && input.department !== current?.department)
            clearMissing(['province','district','ubigeoCode']);
          if (input.province !== undefined && input.province !== current?.province)
            clearMissing(['district','ubigeoCode']);
          if (input.ubigeoCode === null && input.district === undefined) input.district = null;
          // Omitted fields retain their values, including historical domain data.
          const merged = { ...current, ...input };
          const extra = Object.fromEntries(extraKeys.filter(key => input[key] !== undefined).map(key => [key,input[key]]));
          if (!current) {
            if (input.name === undefined) extra.name = user.name || null;
            if (input.lastName === undefined) extra.lastName = user.lastName || null;
          }
          if (merged.documentNumber) {
            if (!merged.documentType) invalid('Selecciona el tipo de documento.');
            if (merged.documentType === 'DNI' && !/^\d{8}$/.test(merged.documentNumber)) invalid('El DNI debe tener 8 dígitos.');
            if (merged.documentType !== 'DNI' && !/^[\p{L}\p{N}][\p{L}\p{N} .\/-]{2,29}$/u.test(merged.documentNumber))
              invalid('Revisa el número de documento (3 a 30 caracteres).');
          }
          const locationChanged = ['countryCode','department','province','district','ubigeoCode'].some(key => input[key] !== undefined);
          if (locationChanged) {
            if (!merged.countryCode && [merged.department,merged.province,merged.district,merged.ubigeoCode].some(Boolean))
              invalid('Selecciona un país antes de completar la ubicación.');
            if (merged.countryCode === 'PE') {
              if (merged.ubigeoCode) {
                const row = ubigeoByCode.get(merged.ubigeoCode);
                if (!row) invalid('Selecciona un distrito del catálogo.');
                for (const key of ['department','province','district']) {
                  if (input[key] && input[key] !== row[key]) invalid('La ubicación no coincide con el distrito seleccionado.');
                  extra[key] = row[key];
                }
              } else {
                if (merged.district) invalid('Selecciona el distrito con su código UBIGEO.');
                if (merged.department && !ubigeos.some(row => row.department === merged.department)) invalid('Selecciona un departamento del catálogo.');
                if (merged.province && !ubigeos.some(row => row.department === merged.department && row.province === merged.province)) invalid('Selecciona una provincia del departamento indicado.');
              }
            } else {
              // Changing country explicitly clears the Peru-specific identifier.
              extra.ubigeoCode = null;
              if (input.ubigeoCode) invalid('UBIGEO solo corresponde a Perú.');
            }
          }
          for (const key of ['avatarFileId','bannerFileId']) {
            if (input[key]) await files.assertOwned(input[key],actor.id,{visibility:'public',image:true});
          }
          await assertLiveFiles(tx,[extra.bannerFileId]);
          const username = input.username ?? user.username;
          if (input.username) {
            const taken = await tx.user.findUnique({where:{username},select:{id:true}});
            if (taken && taken.id !== actor.id) throw new AppError('Este nombre de usuario ya está en uso',409,'USERNAME_IN_USE');
          }
          const names = {
            name: input.name !== undefined ? input.name : current ? current.name : user.name,
            lastName: input.lastName !== undefined ? input.lastName : current ? current.lastName : user.lastName
          };
          const displayName = [names.name,names.lastName].filter(Boolean).join(' ');
          const publicName = identityKeys.some(key => input[key] !== undefined)
            ? (displayName || '@'+username).slice(0,120)
            : input.publicName || current?.publicName || (displayName || '@'+username).slice(0,120);
          await legacy(tx).save(actor,{...merged,location:merged.location ?? undefined,publicName,visibility:current?.visibility || 'PRIVATE'});
          if (extra.dateOfBirth !== undefined) extra.dateOfBirth = extra.dateOfBirth ? new Date(extra.dateOfBirth+'T00:00:00.000Z') : null;
          const profile = await tx.participantProfile.update({where:{userId:actor.id},data:extra});
          // Only account identity belongs in User. Names remain exclusively in Profile.
          if (input.username !== undefined)
            await tx.user.update({where:{id:actor.id},data:{username}});
          if (submitted.socialLinks !== undefined) {
            await tx.participantSocialLink.deleteMany({where:{participantProfileId:profile.id}});
            if (submitted.socialLinks.length) await tx.participantSocialLink.createMany({data:submitted.socialLinks.map(link=>({...link,participantProfileId:profile.id}))});
          }
          if (submitted.disciplines !== undefined) await saveSports(tx,profile.id,submitted.disciplines);
          const participantDisciplines = await tx.participantDiscipline.findMany({where:{participantProfileId:profile.id},...sportsInclude});
          const socialLinks = await tx.participantSocialLink.findMany({where:{participantProfileId:profile.id},select:{platform:true,url:true},orderBy:{platform:'asc'}});
          return view({...profile,socialLinks,participantDisciplines},username);
        });
      } catch(error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('username'))
          throw new AppError('Este nombre de usuario ya está en uso',409,'USERNAME_IN_USE');
        throw error;
      }
    },
    // No new public profile route is exposed in this stage.
    async getPublic(id) {
      const profile=await legacy(db).getPublic(id);
      return {...profile,disciplines:sportsView(await db.participantDiscipline.findMany({where:{participantProfileId:id},...sportsInclude}))};
    },
    participation: actor => legacy(db).participation(actor),
    moderate: (actor,id,decision) => legacy(db).moderate(actor,id,decision)
  };
}
