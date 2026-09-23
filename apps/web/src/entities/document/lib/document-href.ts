// Search parameters rather than dynamic segments: a static export renders every
// segment's values at build time, and a reader's documents are not known then.

export const NEW_DOCUMENT_HREF = '/documents/new';

export function documentsHref(tag: string | null): string {
  return tag === null
    ? '/documents'
    : `/documents?${new URLSearchParams({ tag })}`;
}

export function documentHref(id: string): string {
  return `/documents/edit?${new URLSearchParams({ id })}`;
}
