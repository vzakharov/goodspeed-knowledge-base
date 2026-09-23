import { Text } from '@mantine/core';

import { PageShell, Section } from '@/shared/ui';

/** Placeholder until the product's own pages exist: one real route for the static export to render. */
export function HomePage() {
  return (
    <PageShell>
      <Section id="knowledge-base" standalone>
        <Text>Documents, and a chat that answers from them.</Text>
      </Section>
    </PageShell>
  );
}
