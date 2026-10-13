import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeOrganizerEvents} from '../server/event-priority.js';
import {createPersonalEvents} from '../server/personal-events.js';
const row=(id,owner,preferred)=>({id,organizerId:owner,organizer:{preferredEventId:preferred}});
test('priority preserves other organizers slots and chronological order of remaining events',()=>{
 const rows=[row('run','a','swim'),row('other','b'),row('bike','a','swim'),row('swim','a','swim'),row('third','c')];
 assert.deepEqual(prioritizeOrganizerEvents(rows).map(e=>e.id),['swim','other','run','bike','third']);
 assert.equal(rows[0].id,'run');
});
test('absent, expired or unpublished preferred event does not move other events',()=>{
 const rows=[row('run','a','absent'),row('other','b'),row('bike','a','absent')];
 assert.deepEqual(prioritizeOrganizerEvents(rows),rows);
 assert.deepEqual(prioritizeOrganizerEvents([]),[]);
});
test('each organizer can independently prioritize their own slots',()=>{
 const rows=[row('a1','a','a2'),row('b1','b','b2'),row('a2','a','a2'),row('b2','b','b2')];
 assert.deepEqual(prioritizeOrganizerEvents(rows).map(e=>e.id),['a2','b2','a1','b1']);
});
const id='00000000-0000-4000-8000-000000000001';
function service({owner='owner',status='PUBLISHED',count=2}={}){
 const writes=[];
 const db={$queryRaw:async()=>[],event:{findUnique:async()=>({id,organizerId:owner,status,startsAt:new Date(Date.now()+86400000)}),count:async()=>count},user:{update:async args=>writes.push(args),updateMany:async args=>writes.push(args)}};
 return {svc:createPersonalEvents({db,commerce:{run:async(_,fn)=>fn({database:db})}}),writes};
}
test('setting and clearing preference persist one organizer preference',async()=>{
 const {svc,writes}=service();await svc.priority({id:'owner'},id,{enabled:true});await svc.priority({id:'owner'},id,{enabled:false});
 assert.equal(writes[0].data.preferredEventId,id);assert.equal(writes[1].data.preferredEventId,null);assert.equal(writes[1].where.preferredEventId,id);
});
test('foreign events, drafts and a single upcoming event cannot be prioritized',async()=>{
 for(const config of [{owner:'other'},{status:'DRAFT'},{count:1}]){
  const {svc,writes}=service(config);await assert.rejects(()=>svc.priority({id:'owner'},id,{enabled:true}));assert.equal(writes.length,0);
 }
});
