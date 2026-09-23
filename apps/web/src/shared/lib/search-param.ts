import { useSearchParams } from 'next/navigation';

/**
 * One search parameter of the current address. In a static export the address
 * is where page state lives — there is no segment for a reader's ids — and a
 * caller needs a `Suspense` boundary, since the build has no query string.
 */
export function useSearchParam(name: string): string | null {
  // `null` only under the Pages Router, which `apps/web/pages/` keeps empty;
  // Next's types cover both.
  return useSearchParams()?.get(name) ?? null;
}

/** `path` carrying the parameter, or bare when there is no value. */
export function withSearchParam(
  path: string,
  name: string,
  value: string | null,
): string {
  return value === null
    ? path
    : `${path}?${new URLSearchParams({ [name]: value })}`;
}
