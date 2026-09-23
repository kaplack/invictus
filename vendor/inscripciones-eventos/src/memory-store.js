export function createMemoryRegistrationStore(){
  const registrations=new Map(); const events=new Map();
  return { events:{ put:e=>events.set(e.id,e), get:id=>events.get(id) },
    registrations:{ create:r=>{registrations.set(r.id,r);return r}, get:id=>registrations.get(id), update:(id,r)=>{registrations.set(id,r);return r}, list:()=>[...registrations.values()], findByEventUser:(eventId,userId)=>[...registrations.values()].find(r=>r.eventId===eventId&&r.userId===userId) } };
}

