import { z } from 'zod';
import { listQuerySchema } from '../utils/query.js';

/** Email + password used by login. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** Body of POST /api/auth/register. */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
});

const phone = z.string().trim().min(6, 'Phone is required').max(20);

/** Body of POST /api/doctors. */
export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  specialization: z.string().trim().min(2, 'Specialization is required').max(60),
  hospital: z.string().trim().min(2, 'Hospital is required').max(80),
  phone,
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

/** Body of PUT /api/doctors/:id - same rules, all fields optional. */
export const updateDoctorSchema = createDoctorSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Send at least one field to update' }
);

/** Body of POST /api/patients. */
export const createPatientSchema = z.object({
  doctor: z.string().trim().min(1, 'Doctor is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  age: z.coerce.number().int('Age must be a whole number').min(0).max(120),
  gender: z.enum(['male', 'female', 'other']).default('other'),
  phone,
  email: z.string().trim().toLowerCase().email('Enter a valid email address').or(z.literal('')).default(''),
  condition: z.string().trim().min(2, 'Condition is required').max(80),
  status: z.enum(['active', 'recovered', 'critical']).default('active'),
  visitDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).default(''),
});

/** Body of PUT /api/patients/:id. */
export const updatePatientSchema = createPatientSchema.partial()
  .extend({ doctor: z.string().trim().min(1).optional() })
  .refine((data) => Object.keys(data).length > 0, { message: 'Send at least one field to update' });

/** Query of GET /api/doctors. */
export const doctorListQuerySchema = listQuerySchema.extend({
  specialization: z.string().trim().optional(),
  hospital: z.string().trim().optional(),
});

/** Query of GET /api/patients and GET /api/doctors/:id/patients. */
export const patientListQuerySchema = listQuerySchema.extend({
  doctor: z.string().trim().optional(),
  condition: z.string().trim().optional(),
  status: z.enum(['active', 'recovered', 'critical']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  minAge: z.coerce.number().int().min(0).max(120).optional(),
  maxAge: z.coerce.number().int().min(0).max(120).optional(),
});
