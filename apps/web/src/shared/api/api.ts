import { createApiClient } from './api-client';
import { env } from './env';
import { supabase } from './supabase';

/** The API, as the signed-in reader. */
export const api = createApiClient({
  apiUrl: env.NEXT_PUBLIC_API_URL,
  accessToken: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error !== null) throw error;

    return data.session?.access_token ?? null;
  },
});
