import { z } from 'zod';
import { AppError } from '../http/errors.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa tu nombre').max(80),
  lastName: z.string().trim().min(2, 'Ingresa tus apellidos').max(120),
  email: z.string().trim().email('Ingresa un correo válido').max(254),
  password: z
    .string()
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(128)
    .regex(/[a-z]/, 'Incluye una letra minúscula')
    .regex(/[A-Z]/, 'Incluye una letra mayúscula')
    .regex(/[0-9]/, 'Incluye un número'),
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
  register: (body) => parse(registerSchema, body),
  login: (body) => parse(loginSchema, body),
};
