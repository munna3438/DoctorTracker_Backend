import { z } from 'zod';
import { ApiError } from './ApiError.js';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/** Shared query rules for every list endpoint (search / filter / sort / paginate). */
export const listQuerySchema = z.object({
  page: z.string().optional().transform((v) => Math.max(toInt(v, 1), 1)),
  limit: z.string().optional().transform((v) => Math.min(Math.max(toInt(v, 10), 1), 100)),
  sort: z.string().optional().default('-createdAt'),
  search: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

/**
 * Turns `?page=2&limit=10&sort=name` into { skip, limit, sort }.
 */
export function getPagination(query) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const direction = query.sort?.startsWith('-') ? -1 : 1;
  const field = (query.sort?.replace(/^-/, '') || 'createdAt').trim();

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sort: { [field]: direction },
  };
}

/**
 * Builds a `createdAt` range filter from ?from=2026-01-01&to=2026-02-01
 */
export function getDateRange(query) {
  const range = {};
  if (query.from) range.$gte = new Date(query.from);
  if (query.to) {
    // "to" is a date, so include the whole day
    const end = new Date(query.to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return Object.keys(range).length ? range : null;
}

/**
 * Parses and validates a request payload with a zod schema.
 * Throws a 400 ApiError with field level details when it does not match.
 */
export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
    throw ApiError.badRequest('Validation failed', details);
  }
  return result.data;
}
