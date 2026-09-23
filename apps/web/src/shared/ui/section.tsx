import { Box, Stack, Title } from '@mantine/core';

import type { WithChildren, WithId } from '@/shared/typings';

type SectionProps = WithId &
  WithChildren & {
    /** The section is the whole page, so its `/id` is the document's heading. */
    standalone?: boolean;
  };

const SECTION_GAP = 24;

/**
 * A top-level section whose anchor doubles as the nav target. Only a standalone
 * one is titled from its id; a section sharing a page heads itself, or not at
 * all.
 */
export function Section({ id, standalone = false, children }: SectionProps) {
  return (
    <Box component="section" {...{ id }}>
      <Stack gap={SECTION_GAP}>
        {standalone && <Title order={1}>/{id}</Title>}
        {children}
      </Stack>
    </Box>
  );
}

/** Adds to the Stack's gap, which does not collapse with it, to reach 32px. */
export const SUBHEADING_GAP = 32 - SECTION_GAP;

/** A heading inside a `Section`, one level down from its title. */
export function Subheading({ children }: WithChildren) {
  return (
    <Title order={3} mt={SUBHEADING_GAP}>
      {children}
    </Title>
  );
}
