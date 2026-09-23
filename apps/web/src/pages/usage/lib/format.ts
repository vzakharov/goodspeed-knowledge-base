const count = new Intl.NumberFormat();

export function tokenCount(tokens: number): string {
  return count.format(tokens);
}

const mediumDay = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

/** A report day is a UTC calendar day, so it is shown in UTC wherever the reader is. */
export function reportDay(day: string): string {
  return mediumDay.format(new Date(day));
}
