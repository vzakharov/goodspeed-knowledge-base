import type { MantineColorScheme } from '@mantine/core';

/** `auto` is the absence of a pick rather than a third thing to pick. */
export type PickedColorScheme = Exclude<MantineColorScheme, 'auto'>;

/**
 * A pick equal to the reader's system setting is stored as no preference at
 * all. Called on a click and nowhere else, so an override outlives the
 * reader's own system changing.
 */
export function preferredColorScheme(
  picked: PickedColorScheme,
  system: PickedColorScheme,
): MantineColorScheme {
  return picked === system ? 'auto' : picked;
}
