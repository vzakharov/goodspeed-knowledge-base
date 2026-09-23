// Runs TypeScript under Node through SWC, with the decorator metadata Nest's
// dependency injection reads and Node's own type stripping cannot emit. The
// flag points @swc-node at `.swcrc`, so running from source and `pnpm build`
// compile with one configuration.
process.env.SWCRC = 'true';
await import('@swc-node/register/esm-register');
