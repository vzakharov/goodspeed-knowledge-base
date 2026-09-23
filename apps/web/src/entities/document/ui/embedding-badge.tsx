import type { EmbeddingState, EmbeddingStatus } from '@kb/contracts';
import { Badge, type BadgeProps, Tooltip } from '@mantine/core';

import type { Labeled } from '@/shared/typings';

type Look = Labeled &
  Pick<BadgeProps, 'color' | 'variant'> & {
    /** What the status means for the reader, in a sentence. */
    explain: (state: EmbeddingState) => string;
  };

/**
 * Only a failure is coloured: the palette is monochrome, and the one state
 * asking the reader to act is the one that breaks from it. The rest keep to
 * `outline` and the theme's `default` skin: Mantine's tinted variants resolve
 * against a literal palette, and on this one lose their text in a scheme.
 */
const LOOK = {
  pending: {
    label: 'Embedding',
    variant: 'default',
    explain: () => 'Being split and embedded; not searchable yet.',
  },
  ready: {
    label: 'Searchable',
    variant: 'outline',
    explain: ({ model }) =>
      `The chat can answer from it (${model ?? 'unknown model'}).`,
  },
  failed: {
    label: 'Embedding failed',
    variant: 'light',
    color: 'red',
    explain: ({ error }) => error ?? 'The last embedding run failed.',
  },
  stale: {
    label: 'Out of date',
    variant: 'default',
    explain: ({ model }) =>
      `Embedded with ${model ?? 'another model'}, which is no longer the configured one; embed it again to search it.`,
  },
} as const satisfies Record<EmbeddingStatus, Look>;

export function embeddingExplanation(embedding: EmbeddingState): string {
  return LOOK[embedding.status].explain(embedding);
}

type EmbeddingBadgeProps = { embedding: EmbeddingState };

/** Whether the chat can reach a document, and why not when it cannot. */
export function EmbeddingBadge({ embedding }: EmbeddingBadgeProps) {
  const { label, color, variant }: Look = LOOK[embedding.status];

  return (
    <Tooltip label={embeddingExplanation(embedding)} multiline maw={320}>
      <Badge {...{ color, variant }} radius="sm">
        {label}
      </Badge>
    </Tooltip>
  );
}
