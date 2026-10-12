import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRulesChangeAllowed} from '../server/event-setup/rules.js';
import {assertEventSetupReady} from '../server/event-setup/service.js';
import {createEventService} from '../vendor/gestion-eventos/src/service.js';

const id='12345678-1234-4234-8234-123456789012';
const pdf='12345678-1234-4234-8234-123456789013';
const event={id,organizerId:id,title:'Competencia',description:'Descripción',timeZone:'America/Lima',startsAt:'2027-01-01T12:00:00Z',status:'DRAFT',mode:'MANAGED',competitionConfig:null,rulesFileId:pdf};
test('bases: publicación admite eventos con y sin PDF',async()=>{
 const db={eventCategory:{findMany:async()=>[]}};
 await assertEventSetupReady(db,{...event,rulesFileId:null});
 await assertEventSetupReady(db,event);
 await assertEventSetupReady(db,{...event,mode:'INFORMATIONAL',rulesFileId:null});
});
test('bases: valida propiedad, visibilidad pública y tipo PDF',async()=>{
 let type='image/png';
 const store={events:{get:async()=>({...event,rulesFileId:null}),getBySlug:async()=>event,list:async()=>[],create:async e=>e,update:async(_,e)=>e}};
 const files={assertOwned:async(fileId,ownerId,options)=>{assert.equal(fileId,pdf);assert.equal(ownerId,id);assert.equal(options.visibility,'public');return {contentType:type};}};
 const service=createEventService({store,fileService:files});
 await assert.rejects(service.update({id},id,{rulesFileId:pdf}),{code:'INVALID_RULES_FILE'});
 type='application/pdf';assert.equal((await service.update({id},id,{rulesFileId:pdf})).rulesFileId,pdf);
});
test('bases: servidor bloquea reemplazo y eliminación con inscritos',async()=>{
 let count=1;
 const db={eventRegistration:{count:async({where})=>{assert.equal(where.eventId,id);return count;}}};
 for(const rulesFileId of [null,id])await assert.rejects(assertRulesChangeAllowed(db,event,{...event,rulesFileId}),{code:'RULES_LOCKED'});
 await assertRulesChangeAllowed(db,event,event);
 await assertRulesChangeAllowed(db,{...event,rulesFileId:null},{...event,rulesFileId:pdf});
 count=0;await assertRulesChangeAllowed(db,event,{...event,rulesFileId:id});
});
