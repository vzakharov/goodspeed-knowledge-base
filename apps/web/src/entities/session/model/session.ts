import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

import { queryClient, supabase } from '@/shared/api';

type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; session: Session };

const LOADING: SessionState = { status: 'loading' };
const SIGNED_OUT: SessionState = { status: 'signed-out' };

let current: SessionState = LOADING;
const listeners = new Set<() => void>();
let listening = false;

// Supabase reports the stored session as `INITIAL_SESSION` once a listener is
// attached, then every sign-in, sign-out and token refresh after it — so one
// listener for the page's lifetime, attached on first use rather than at import,
// which would run it during the static prerender too.
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!listening) {
    listening = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      current =
        session === null ? SIGNED_OUT : { status: 'signed-in', session };
      for (const notify of listeners) notify();
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

/** `loading` until Supabase has read the stored session, and on the server. */
export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => LOADING,
  );
}

/** Drops the cache with the session, so the next reader starts from nothing of this one's. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error !== null) throw error;
  queryClient.clear();
}
