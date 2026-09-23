import { Text, Title } from '@mantine/core';

import type { WithOptionalEyebrow, WithOptionalLink } from '@/shared/typings';

import { Card, CardLink, type Summarized } from './card';

/** A heading and its blurb; given an `href`, the whole card links off the site. */
export function SummaryCard({
  title,
  description,
  href,
  eyebrow,
}: Summarized & WithOptionalLink & WithOptionalEyebrow) {
  return (
    <Card>
      {href !== undefined && <CardLink {...{ href }} aria-label={title} />}
      {eyebrow !== undefined && (
        <Text size="xs" tt="uppercase" opacity={0.6} mb={6} lts="0.06em">
          {eyebrow}
        </Text>
      )}
      <Title order={3} size="h4" mb={8}>
        {title}
      </Title>
      <Text lh={1.625}>{description}</Text>
    </Card>
  );
}
