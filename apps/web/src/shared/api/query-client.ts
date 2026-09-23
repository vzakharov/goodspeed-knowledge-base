import { QueryClient } from '@tanstack/react-query';

import { ApiRequestError } from './api-client';

const MAX_RETRIES = 2;

/**
 * Only what may pass on its own is retried: a 5xx, or a request that never
 * reached the API (`fetch` rejects with a `TypeError`). A 4xx or a body the
 * contract rejects fails the same way every time.
 */
function isTransient(error: Error): boolean {
  return error instanceof ApiRequestError
    ? error.status >= 500
    : error instanceof TypeError;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES && isTransient(error),
    },
  },
});
