import { exportJWK, generateKeyPair, type JWTPayload, SignJWT } from 'jose';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { listen } from '../../test/listen.ts';
import {
  createTokenVerifier,
  InvalidTokenError,
  type TokenVerifier,
} from './token-verifier.ts';

const USER_ID = '6f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const SIGNED_IN = { sub: USER_ID, role: 'authenticated' };

let server: Server;
let supabaseUrl: string;
let verifier: TokenVerifier;
let sign: (
  claims: JWTPayload,
  options?: { expiresIn?: string; issuer?: string; byStranger?: boolean },
) => Promise<string>;

// Stands in for a Supabase project: a signing key, and the JWKS endpoint that
// publishes its public half.
before(async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const stranger = await generateKeyPair('ES256');
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: 'project-key',
    alg: 'ES256',
    use: 'sig',
  };

  server = createServer((request, response) => {
    response.writeHead(
      request.url === '/auth/v1/.well-known/jwks.json' ? 200 : 404,
      {
        'Content-Type': 'application/json',
      },
    );
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  supabaseUrl = await listen(server);
  verifier = createTokenVerifier(supabaseUrl);

  sign = async (
    claims,
    {
      expiresIn = '1h',
      issuer = `${supabaseUrl}/auth/v1`,
      byStranger = false,
    } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'project-key' })
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(byStranger ? stranger.privateKey : privateKey);
});

after(() => {
  server.closeAllConnections();
  server.close();
});

const rejectsAsInvalid = async (token: Promise<string>) =>
  assert.rejects(
    token.then(async (value) => verifier.verify(value)),
    InvalidTokenError,
  );

describe('createTokenVerifier', () => {
  it("accepts a signed-in user's token and returns their id", async () => {
    const claims = await verifier.verify(await sign(SIGNED_IN));

    assert.deepEqual(claims, SIGNED_IN);
  });

  it('refuses an expired token', async () =>
    rejectsAsInvalid(sign(SIGNED_IN, { expiresIn: '-1m' })));

  it("refuses a token signed by a key that is not the project's", async () =>
    rejectsAsInvalid(sign(SIGNED_IN, { byStranger: true })));

  it('refuses a token from another issuer', async () =>
    rejectsAsInvalid(
      sign(SIGNED_IN, { issuer: 'https://evil.example/auth/v1' }),
    ));

  it("refuses the anonymous key's token, which names no user", async () =>
    rejectsAsInvalid(sign({ role: 'anon' })));

  it('refuses a service-role token', async () =>
    rejectsAsInvalid(sign({ sub: USER_ID, role: 'service_role' })));

  it('refuses a token with its signature tampered', async () => {
    const token = await sign(SIGNED_IN);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({
        sub: '00000000-0000-4000-8000-000000000000',
        role: 'authenticated',
      }),
    ).toString('base64url');

    await rejectsAsInvalid(Promise.resolve(`${header}.${forged}.${signature}`));
  });

  it('refuses something that is not a token at all', async () =>
    rejectsAsInvalid(Promise.resolve('not-a-jwt')));
});
