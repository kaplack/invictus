import { sendDomainError } from '@base/usuarios-acceso/contracts';
import express from 'express';import {ProfileError} from './errors.js';
export function createProfileRouter({service,getUser=req=>req.user??null}){const r=express.Router();const run=fn=>async(req,res)=>{try{const x=await fn(req,res);res.json(x)}catch(e){return sendDomainError(res,e)}};r.get('/me',run(req=>service.getMine(getUser(req))));r.put('/me',run(req=>service.save(getUser(req),req.body||{})));r.get('/me/participations',run(req=>service.participation(getUser(req))));r.get('/public/:id',run(req=>service.getPublic(req.params.id)));r.patch('/admin/:id/moderation',run(req=>service.moderate(getUser(req),req.params.id,req.body?.decision)));return r}

