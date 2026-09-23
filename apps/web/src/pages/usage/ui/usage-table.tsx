import type { UsageDay } from '@kb/contracts';
import { Table, Text } from '@mantine/core';

import { reportDay, tokenCount } from '../lib/format';
import { KindName } from './kind';

/** Below this the table scrolls sideways rather than squeezing its columns. */
const MIN_WIDTH = 640;

function Calls({ calls, unreportedCalls }: UsageDay) {
  return (
    <>
      {calls}
      {unreportedCalls > 0 && (
        <Text size="xs" c="dimmed" span>
          {' '}
          ({unreportedCalls} uncounted)
        </Text>
      )}
    </>
  );
}

type UsageTableProps = { days: UsageDay[] };

/** Every row the API reports, newest day first; a day is named once, on its first row. */
export function UsageTable({ days }: UsageTableProps) {
  return (
    <Table.ScrollContainer minWidth={MIN_WIDTH}>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Day</Table.Th>
            <Table.Th>Kind</Table.Th>
            <Table.Th>Model</Table.Th>
            <Table.Th ta="right">Calls</Table.Th>
            <Table.Th ta="right">Prompt tokens</Table.Th>
            <Table.Th ta="right">Completion tokens</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {days.map((row, index) => {
            const {
              day,
              kind,
              provider,
              model,
              promptTokens,
              completionTokens,
            } = row;
            const firstOfDay = days[index - 1]?.day !== day;

            return (
              <Table.Tr key={`${day} ${kind} ${provider} ${model}`}>
                <Table.Td>{firstOfDay && reportDay(day)}</Table.Td>
                <Table.Td>
                  <KindName {...{ kind }} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace" span>
                    {model}
                  </Text>{' '}
                  <Text size="xs" c="dimmed" span>
                    {provider}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Calls {...row} />
                </Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {tokenCount(promptTokens)}
                </Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {kind === 'embedding' ? '—' : tokenCount(completionTokens)}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
