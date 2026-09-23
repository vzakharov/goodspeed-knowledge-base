/** Joins class names, dropping the ones a conditional left out. */
export function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(' ');
}
