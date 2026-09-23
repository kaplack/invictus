import { AppError } from '@base/usuarios-acceso';
export const isAdmin=u=>u?.role==='ADMIN';
export const eventActor=u=>isAdmin(u)?{...u,role:'SUPERADMIN'}:u;
export function organizer(u){ if(!u||!['ADMIN','ORGANIZER'].includes(u.role)) throw new AppError('No tienes permiso para gestionar eventos',403,'FORBIDDEN'); return eventActor(u); }
export function administrator(u){ if(!isAdmin(u)) throw new AppError('Acceso reservado a administración',403,'FORBIDDEN'); return u; }
export const resolvePermissions=async u=>isAdmin(u)?['panel:access','orders:manage','payments:review','recipients:manage','files:manage']:u?.role==='ORGANIZER'?['panel:access']:[];
