import { AppError } from '@base/usuarios-acceso';
export class StoreError extends AppError { constructor(message, status = 400, code = 'STORE_ERROR') { super(message, status, code); } }
