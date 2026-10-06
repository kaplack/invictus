import express from 'express';
import {rateLimit} from 'express-rate-limit';
import {sendFileStream} from '@base/archivos-imagenes';
import {AppError} from '@base/usuarios-acceso';
export function createGuestRegistrationRouter({service,categoryRegistrations}){
 const r=express.Router();const token=req=>req.get('x-registration-token')||req.query.token;
 const writes=rateLimit({windowMs:3600000,limit:60,standardHeaders:true,legacyHeaders:false});
 const reads=rateLimit({windowMs:60000,limit:120,standardHeaders:true,legacyHeaders:false});
 r.get('/events/:id/guest-registration-options',reads,async(req,res)=>res.json(await service.options(req.params.id)));
 r.post('/events/:id/guest-registration-token',writes,async(req,res)=>res.status(201).json(await service.start(req.params.id)));
 r.post('/events/:id/guest-registrations',writes,async(req,res)=>res.status(201).json(await service.enroll(token(req),req.params.id,req.body)));
 r.post('/events/:id/guest-proof',writes,express.raw({type:()=>true,limit:10*1024*1024,inflate:false}),async(req,res)=>{
  let name;try{name=decodeURIComponent(req.get('x-file-name')||'');}catch{throw new AppError('Nombre inválido',400,'INVALID_FILENAME');}
  res.status(201).json({file:await service.upload(token(req),req.params.id,{name,contentType:(req.get('content-type')||'').split(';')[0].trim().toLowerCase(),body:req.body})});
 });
 r.get('/guest-registration',reads,async(req,res)=>{res.set('Referrer-Policy','no-referrer');res.json(await service.get(token(req)));});
 r.post('/guest-registration/resubmit',writes,async(req,res)=>res.json(await service.resubmit(token(req),req.body)));
 const send=async(res,result,attachment=false)=>{res.set({'Content-Type':result.file.contentType,'Content-Length':String(result.file.size),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer',...(attachment?{'Content-Disposition':'attachment; filename="comprobante"'}:{})});await sendFileStream(result.stream,res);};
 r.get('/events/:id/guest-payment-methods/:methodId/qr',reads,async(req,res)=>send(res,await categoryRegistrations.optionQr(null,req.params.id,req.params.methodId)));
 r.get('/guest-registration/qr',reads,async(req,res)=>send(res,await service.qr(token(req))));
 r.get('/guest-registration/payments/:paymentId/proof',reads,async(req,res)=>send(res,await service.proof(token(req),req.params.paymentId),true));
 r.use((error,req,res,next)=>{if(error.type==='entity.too.large')return next(new AppError('Archivo demasiado grande',413,'FILE_TOO_LARGE'));if(error.type==='encoding.unsupported')return next(new AppError('No se admiten cargas comprimidas',415,'UNSUPPORTED_ENCODING'));next(error);});
 return r;
}
