import { z } from 'zod';
import { AppError } from '../http/errors.js';

export const usernameSchema = z.string().trim().toLowerCase().min(3).max(30)
  .regex(/^[a-z0-9._]+$/, 'Usa letras a–z, números, punto o guion bajo');
const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email('Ingresa un correo válido').max(254),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido').max(254),
  password: z.string().min(1, 'Ingresa tu contraseña').max(128),
});

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = z.flattenError(result.error).fieldErrors;
    throw new AppError('Revisa los datos enviados', 400, 'VALIDATION_ERROR', fields);
  }
  return result.data;
}

export const authValidation = {
  username: (value) => parse(usernameSchema, value),
  register: (body) => parse(registerSchema, body),
  login: (body) => parse(loginSchema, body),
};
