import { z } from 'zod';

export const idSchema = z.uuid();

/** An instant on the wire: ISO 8601 in UTC, as `Date#toISOString` writes it. */
export const timestampSchema = z.iso.datetime();

export const timestampsShape = {
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

/** A string that has to say something once its surrounding whitespace is gone. */
export function nonBlank(max: number) {
  return z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, {
      message: 'Must not be blank',
    });
}
