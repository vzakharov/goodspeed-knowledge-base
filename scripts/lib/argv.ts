export const flag = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
};

export const given = (name: string): boolean =>
  process.argv.includes(`--${name}`);
