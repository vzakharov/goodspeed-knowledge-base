// Search parameters rather than dynamic segments: a static export renders every
// segment's values at build time, and a reader's documents are not known then.

import { withSearchParam } from '@/shared/lib/search-param';

export const NEW_DOCUMENT_HREF = '/documents/new';

export function documentsHref(tag: string | null): string {
  return withSearchParam('/documents', 'tag', tag);
}

export function documentHref(id: string): string {
  return withSearchParam('/documents/edit', 'id', id);
}
