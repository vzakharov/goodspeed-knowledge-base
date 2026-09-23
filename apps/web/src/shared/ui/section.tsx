import { Box, Stack, Title } from '@mantine/core';

import type { WithChildren, WithId } from '@/shared/typings';

type SectionProps = WithId &
  WithChildren & {
    /** The section is the whole page, so its `/id` is the document's heading. */
    standalone?: boolean;
  };

const SECTION_GAP = 24;

/** A top-level section, its `id` the anchor. One sharing a page heads itself, or not at all. */
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
