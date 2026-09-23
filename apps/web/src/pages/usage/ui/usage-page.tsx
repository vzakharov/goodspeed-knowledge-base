'use client';

import { USAGE_KINDS, USAGE_WINDOW_DAYS } from '@kb/contracts';
import { Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { pick } from '@/shared/lib/collections';
import { Card, ErrorAlert, PageShell, Section } from '@/shared/ui';

import { usageQuery } from '../api/usage';
import { tokenCount } from '../lib/format';
import {
  dailyUsage,
  kindSummaries,
  type KindSummary,
} from '../lib/usage-summary';
import { KindName, type KindProps } from './kind';
import { UsageChart } from './usage-chart';
import { UsageTable } from './usage-table';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** One kind's totals — the chart's legend, carrying its figures. */
function KindTotal({ calls, tokens, kind }: KindSummary & KindProps) {
  return (
    <Card>
      <Stack gap={4}>
        <KindName {...{ kind }} />
        <Text size="xl" fw={700} ff="monospace">
          {tokenCount(tokens)}
        </Text>
        <Text size="sm" c="dimmed">
          tokens · {plural(calls, 'call', 'calls')}
        </Text>
      </Stack>
    </Card>
  );
}

function UsageReport() {
  const report = useQuery(usageQuery());

  if (report.isPending) return <Loader size="sm" />;
  if (report.isError) {
    return (
      <ErrorAlert title="The usage did not load" {...pick(report, 'error')} />
    );
  }

  const { days } = report.data;
  if (days.length === 0) {
    return (
      <Text c="dimmed">
        No model calls in the last {USAGE_WINDOW_DAYS} days. Ask the chat
        something, or save a document, and they show here.
      </Text>
    );
  }

  const summaries = kindSummaries(days);
  const uncounted = USAGE_KINDS.reduce(
    (total, kind) => total + summaries[kind].unreportedCalls,
    0,
  );

  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {USAGE_KINDS.map((kind) => (
          <KindTotal key={kind} {...{ kind }} {...summaries[kind]} />
        ))}
      </SimpleGrid>
      {uncounted > 0 && (
        <Text size="sm" c="dimmed">
          {plural(uncounted, 'call', 'calls')} came back without token counts
          from the provider, so the totals leave them out.
        </Text>
      )}
      <Title order={2} size="h4">
        Per day
      </Title>
      {/* The query's own timestamp, so the window is fixed while the data is. */}
      <UsageChart daily={dailyUsage(days, new Date(report.dataUpdatedAt))} />
      <Title order={2} size="h4">
        Per model
      </Title>
      <UsageTable {...{ days }} />
    </>
  );
}

export function UsagePage() {
  return (
    <PageShell>
      <Section id="usage">
        <Title order={1}>Usage</Title>
        <Text>
          The tokens each kind of model call spent over the last{' '}
          {USAGE_WINDOW_DAYS} days. Days are UTC.
        </Text>
        <UsageReport />
      </Section>
    </PageShell>
  );
}
