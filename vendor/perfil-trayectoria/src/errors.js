import { AppError } from '@base/usuarios-acceso';
export class ProfileError extends AppError { constructor(message, status = 400, code = 'INVALID_INPUT') { super(message, status, code); } }
