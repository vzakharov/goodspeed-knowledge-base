/**
 * What `vova/no-redundant-property-copy` asks for: `{...pick(printed, 'href')}`
 * over `href={printed.href}`.
 *
 * A verbatim copy of the Playgram app's `shared/collections`, the home of this
 * family: a fix is made there and copied here, and a sibling (`omit`,
 * `mapValues`, `getKeys`) joins this file rather than opening its own.
 * @tobeused by the first page the lint rule flags (step 5).
 */
export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  // @ts-expect-error - we know the end result is a Pick<T, K>
  const result: Pick<T, K> = {};
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

export const isOneOf =
  <const T extends readonly string[]>(values: T) =>
  (value: unknown): value is T[number] =>
    // Widened first: a literal tuple's own `includes` accepts only a member,
    // which is what an unchecked value cannot promise.
    typeof value === 'string' && (values as readonly string[]).includes(value);

/** The same check as a parse: the value, or a throw listing what was allowed. */
export function oneOf<const T extends readonly string[]>(
  values: T,
  value: unknown,
): T[number] {
  if (!isOneOf(values)(value)) {
    throw new Error(
      `Expected one of ${values.join(', ')}, not ${String(value)}`,
    );
  }

  return value;
}

/** Every prefix of a tuple, the empty one included. */
type Prefixes<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? [] | [Head, ...Prefixes<Tail>]
  : [];

/**
 * Exported so whoever owns the lists names the shape once: the parse below then
 * agrees with that name by construction.
 */
export type OneOfEach<T extends ReadonlyArray<readonly string[]>> = Prefixes<{
  [K in keyof T]: T[K][number];
}>;

/**
 * The same parse along a sequence — each value against the list at its position
 * — which may stop short but not run long, as a catch-all route's segments do.
 * The length comes back in the type, so a caller reads the result positionally.
 */
export function oneOfEach<const T extends ReadonlyArray<readonly string[]>>(
  lists: T,
  values: readonly unknown[],
): OneOfEach<T>;

// Which list each element came from is positional, and no signature over a
// mapped array says that — so the narrow return is the overload's, and the body
// declares only what it can check.
export function oneOfEach(
  lists: ReadonlyArray<readonly string[]>,
  values: readonly unknown[],
): string[] {
  if (values.length > lists.length) {
    throw new Error(
      `Expected at most ${lists.length} values, not ${values.length}: ${values.map(String).join(', ')}`,
    );
  }

  return lists
    .slice(0, values.length)
    .map((list, index) => oneOf(list, values[index]));
}
