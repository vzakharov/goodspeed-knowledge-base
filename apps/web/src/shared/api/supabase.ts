import { createClient } from '@supabase/supabase-js';

import { env } from './env';

/**
 * The browser's one Supabase client, used for Auth alone: every read and write
 * of user data goes through the API. It keeps the session in `localStorage`
 * and refreshes the access token before it expires.
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
