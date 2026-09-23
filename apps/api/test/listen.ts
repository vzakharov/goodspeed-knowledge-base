import type { Server } from 'node:http';

/** Starts a server on a free local port and returns its origin. */
export async function listen(server: Server) {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (address === null || typeof address === 'string') {
    throw new Error('The server is not listening on a TCP port');
  }

  return `http://127.0.0.1:${address.port}`;
}
