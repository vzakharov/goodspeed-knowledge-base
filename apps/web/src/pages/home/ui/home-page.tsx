import { Text } from '@mantine/core';

import { PageShell, Section } from '@/shared/ui';

/**
 * Placeholder until the product's own pages land — it exists so the static
 * export renders one real route through the carried design system.
 */
export function HomePage() {
  return (
    <PageShell>
      <Section id="knowledge-base" standalone>
        <Text>Documents, and a chat that answers from them.</Text>
      </Section>
    </PageShell>
  );
}
