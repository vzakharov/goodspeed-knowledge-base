// Reading `--name value` off `process.argv`. What earns a shared home is the
// value form, whose index arithmetic is the same mistake to make twice; a bare
// `includes('--check')` stays where it is written.

export const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
};

export const given = (name: string): boolean =>
  process.argv.includes(`--${name}`);
