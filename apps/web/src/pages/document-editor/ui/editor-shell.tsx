import type { WithChildren, WithId } from '@/shared/typings';
import { InternalLink, PageShell, Section } from '@/shared/ui';

import { documentsHref } from '@/entities/document';

/** Both editor pages: the section, under a way back to the list. */
export function EditorShell({ id, children }: WithId & WithChildren) {
  return (
    <PageShell>
      <Section {...{ id }}>
        <InternalLink href={documentsHref(null)} size="sm">
          ← Documents
        </InternalLink>
        {children}
      </Section>
    </PageShell>
  );
}
