import { Chip, Group } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { documentQueries, documentsHref } from '@/entities/document';

/** Chip values are strings, so "every tag" is the empty one. */
const ALL = '';

type TagFilterProps = { selected: string | null };

/** One tag at a time, as the API filters. */
export function TagFilter({ selected }: TagFilterProps) {
  const tags = useQuery(documentQueries.tags());
  const router = useRouter();

  // The list below reports a failed load; with no tags to offer, the filter
  // does not appear.
  if (!tags.isSuccess || tags.data.tags.length === 0) return null;

  return (
    <Chip.Group
      value={selected ?? ALL}
      onChange={(value) => {
        router.replace(documentsHref(value === ALL ? null : value));
      }}
    >
      <Group gap="xs">
        <Chip value={ALL} size="sm">
          All
        </Chip>
        {tags.data.tags.map(({ tag, documents }) => (
          <Chip key={tag} value={tag} size="sm">
            {tag} · {documents}
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  );
}
