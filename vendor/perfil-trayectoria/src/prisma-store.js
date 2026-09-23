import { runCoordinated, assertLiveFiles } from '@base/usuarios-acceso/contracts';
const view = row => row && ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
export function createPrismaProfileStore(database) {
  return { profiles: {
    async get(id) { return view(await database.participantProfile.findUnique({ where: { id } })); },
    async getByUser(userId) { return view(await database.participantProfile.findUnique({ where: { userId } })); },
    async list() { return (await database.participantProfile.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(view); },
    async upsert(p) { return runCoordinated(database, async tx => {
      await assertLiveFiles(tx, [p.avatarFileId,...(p.documentFileIds||[])]);
      const data = { publicName: p.publicName, bio: p.bio, location: p.location, disciplines: p.disciplines,
        experience: p.experience, achievements: p.achievements, avatarFileId: p.avatarFileId ?? null,
        documentFileIds: p.documentFileIds ?? [], publicLink: p.publicLink ?? null, visibility: p.visibility,
        moderationStatus: p.moderationStatus ?? 'PENDING' };
      // One profile per user; concurrent first saves cannot create two identities.
      return view(await tx.participantProfile.upsert({ where: { userId: p.userId },
        create: { id: p.id, userId: p.userId, ...data, createdAt: p.createdAt ? new Date(p.createdAt) : undefined }, update: data }));
    }); }
  } };
}
