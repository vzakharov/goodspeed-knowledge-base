import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.url(),
});

/**
 * Parsed when the first module that needs it loads, so a missing variable fails
 * the build's prerender naming the variable. Each read is spelled out in full:
 * Next inlines a `NEXT_PUBLIC_*` value only where its name is written literally.
 */
export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
});
