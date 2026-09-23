import { USAGE_KINDS } from '@kb/contracts';
import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { type KeyboardEvent, useState } from 'react';

import { cssColor } from '@/shared/ui';

import { tokenCount } from '../lib/format';
import type { DailyUsage } from '../lib/usage-summary';
import { KIND_COLOR, KindName, type KindProps } from './kind';
import classes from './usage-chart.module.scss';

const HEIGHT = 220;
const Y_AXIS_WIDTH = 48;
const X_AXIS_HEIGHT = 24;
const TOP_PADDING = 8;
/** Surface left between stacked segments, so two fills never touch. */
const SEGMENT_GAP = 2;
const RADIUS = 4;
/** Share of a day's band its column fills. */
const COLUMN_FILL = 0.7;
const TICK_EVERY_DAYS = 7;
const TOOLTIP_OFFSET = 12;

const PLOT_BOTTOM = HEIGHT - X_AXIS_HEIGHT;
const PLOT_HEIGHT = PLOT_BOTTOM - TOP_PADDING;

/** Top of the stack first, as the column reads. */
const STACK_TOP_DOWN = USAGE_KINDS.toReversed();

const compact = new Intl.NumberFormat(undefined, { notation: 'compact' });
const shortDay = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const longDay = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** The smallest 1, 2 or 5 × 10ⁿ at or above `value`, so gridlines land on round numbers. */
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));

  return (
    ([1, 2, 5].find((step) => step * magnitude >= value) ?? 10) * magnitude
  );
}

/** A rectangle whose top corners are rounded — the data end of a column. */
function roundedTop(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const r = Math.min(RADIUS, width / 2, height);

  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join('');
}

type Segment = KindProps & { y: number; height: number };

/** A day's non-empty kinds, bottom up, each inset from the one beneath by the gap. */
function segments({ byKind }: DailyUsage, ceiling: number): Segment[] {
  const stacked: Segment[] = [];
  let base = PLOT_BOTTOM;
  for (const kind of USAGE_KINDS) {
    const full = (byKind[kind] / ceiling) * PLOT_HEIGHT;
    if (full === 0) continue;
    const gap = stacked.length === 0 ? 0 : SEGMENT_GAP;
    const height = Math.max(full - gap, 0);
    stacked.push({ kind, y: base - full, height });
    base -= full;
  }

  return stacked;
}

type DayTooltipProps = { day: DailyUsage; left: number; flip: boolean };

function DayTooltip({ day, left, flip }: DayTooltipProps) {
  return (
    <Paper
      withBorder
      className={classes['tooltip']}
      style={{
        left,
        transform: `translateX(${flip ? `calc(-100% - ${TOOLTIP_OFFSET}px)` : `${TOOLTIP_OFFSET}px`})`,
      }}
    >
      <Stack gap={4}>
        <Text size="xs" c="dimmed">
          {longDay.format(new Date(day.day))}
        </Text>
        <Text size="sm" fw={700}>
          {tokenCount(day.total)} tokens
        </Text>
        {STACK_TOP_DOWN.map((kind) => (
          <Group key={kind} justify="space-between" gap="md" wrap="nowrap">
            <KindName {...{ kind }} />
            <Text size="sm" ff="monospace">
              {tokenCount(day.byKind[kind])}
            </Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

type UsageChartProps = { daily: DailyUsage[] };

/**
 * Tokens per day, stacked by kind. Hover a day, or focus the chart and step
 * with the arrow keys, for its figures; the table beneath carries every one.
 */
export function UsageChart({ daily }: UsageChartProps) {
  const { ref, width } = useElementSize();
  const [active, setActive] = useState<number | null>(null);

  const ceiling = niceCeiling(Math.max(...daily.map(({ total }) => total)));
  const band = (width - Y_AXIS_WIDTH) / daily.length;
  const columnWidth = band * COLUMN_FILL;
  const bandStart = (index: number) => Y_AXIS_WIDTH + index * band;
  const gridlines = [0, ceiling / 2, ceiling];
  const last = daily.length - 1;

  function step(event: KeyboardEvent) {
    const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    setActive((index) => Math.min(Math.max((index ?? last) + delta, 0), last));
  }

  const activeDay = active === null ? undefined : daily[active];

  return (
    <Box ref={ref} className={classes['chart']}>
      {width > 0 && (
        <svg
          {...{ width }}
          height={HEIGHT}
          className={classes['plot']}
          tabIndex={0}
          aria-label="Tokens per day, by kind. Arrow keys step through the days."
          onKeyDown={step}
          onFocus={() => {
            setActive((index) => index ?? last);
          }}
          onBlur={() => {
            setActive(null);
          }}
          onMouseLeave={() => {
            setActive(null);
          }}
        >
          {active !== null && (
            <rect
              x={bandStart(active)}
              y={0}
              width={band}
              height={PLOT_BOTTOM}
              style={{ fill: cssColor('surface-strong') }}
            />
          )}
          {gridlines.map((value) => {
            const y = PLOT_BOTTOM - (value / ceiling) * PLOT_HEIGHT;

            return (
              <g key={value}>
                <line
                  x1={Y_AXIS_WIDTH}
                  x2={width}
                  y1={y}
                  y2={y}
                  className={classes['grid']}
                />
                <text
                  x={Y_AXIS_WIDTH - 8}
                  {...{ y }}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className={classes['axis']}
                >
                  {compact.format(value)}
                </text>
              </g>
            );
          })}
          {daily.map((day, index) => {
            const x = bandStart(index) + (band - columnWidth) / 2;
            const stacked = segments(day, ceiling);
            const top = stacked.at(-1);

            return (
              <g key={day.day}>
                {stacked.map(({ kind, y, height }) => (
                  <path
                    key={kind}
                    d={
                      kind === top?.kind
                        ? roundedTop(x, y, columnWidth, height)
                        : `M${x},${y}h${columnWidth}v${height}h${-columnWidth}Z`
                    }
                    style={{ fill: cssColor(KIND_COLOR[kind]) }}
                  />
                ))}
                {(last - index) % TICK_EVERY_DAYS === 0 && (
                  <text
                    x={bandStart(index) + band / 2}
                    y={HEIGHT - 4}
                    textAnchor={index === last ? 'end' : 'middle'}
                    className={classes['axis']}
                  >
                    {shortDay.format(new Date(day.day))}
                  </text>
                )}
                <rect
                  x={bandStart(index)}
                  y={0}
                  width={band}
                  height={PLOT_BOTTOM}
                  className={classes['hit']}
                  onMouseEnter={() => {
                    setActive(index);
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && activeDay !== undefined && (
        <DayTooltip
          day={activeDay}
          left={bandStart(active) + (active > last / 2 ? 0 : band)}
          flip={active > last / 2}
        />
      )}
    </Box>
  );
}
