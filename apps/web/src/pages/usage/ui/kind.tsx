import type { UsageDay, UsageKind } from '@kb/contracts';
import { Box, Group, Text } from '@mantine/core';

import { type CssColor, cssColor } from '@/shared/ui';

/** A kind's colour follows the kind, so a chart and its legend always agree. */
export const KIND_COLOR: Record<UsageKind, CssColor> = {
  chat: 'series-1',
  condense: 'series-2',
  embedding: 'series-3',
};

const KIND_LABEL: Record<UsageKind, string> = {
  chat: 'Answers',
  condense: 'Follow-up rewriting',
  embedding: 'Embeddings',
};

const SWATCH_SIZE = 10;

export type KindProps = Pick<UsageDay, 'kind'>;

function KindSwatch({ kind }: KindProps) {
  return (
    <Box
      w={SWATCH_SIZE}
      h={SWATCH_SIZE}
      style={{
        flexShrink: 0,
        borderRadius: 2,
        background: cssColor(KIND_COLOR[kind]),
      }}
    />
  );
}

/** The kind's name beside its colour — identity is never carried by colour alone. */
export function KindName({ kind }: KindProps) {
  return (
    <Group gap={6} wrap="nowrap">
      <KindSwatch {...{ kind }} />
      <Text size="sm" span>
        {KIND_LABEL[kind]}
      </Text>
    </Group>
  );
}
