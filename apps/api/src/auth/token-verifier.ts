import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import { z } from 'zod';

const claimsSchema = z.object({
  sub: z.uuid(),
  role: z.literal('authenticated'),
});

export type VerifiedClaims = z.infer<typeof claimsSchema>;

export type TokenVerifier = {
  verify: (token: string) => Promise<VerifiedClaims>;
};

/** The token is not one Supabase Auth issued to a signed-in user, or no longer valid. */
export class InvalidTokenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Verifies a Supabase access token locally, against the project's published
 * signing keys: signature, issuer, audience and expiry. Only asymmetric keys
 * can be verified this way, which is what a Supabase project signs with by
 * default and what `pnpm setup` configures the local one to use.
 *
 * The key set is fetched on first use and cached, and fetched again when a
 * token names a key it does not hold — so a key rotation needs no restart.
 */
export function createTokenVerifier(supabaseUrl: string): TokenVerifier {
  const issuer = `${supabaseUrl}/auth/v1`;
  const keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return {
    verify: async (token) => {
      let payload: unknown;

      try {
        ({ payload } = await jwtVerify(token, keys, {
          issuer,
          audience: 'authenticated',
          algorithms: ['ES256', 'RS256'],
        }));
      } catch (error) {
        // Anything else — the key set unreachable, for one — is the API's
        // failure rather than the token's, and not a 401.
        if (
          error instanceof errors.JOSEError &&
          !(error instanceof errors.JWKSTimeout)
        ) {
          throw new InvalidTokenError(error.code, { cause: error });
        }

        throw error;
      }

      const claims = claimsSchema.safeParse(payload);

      if (!claims.success) {
        throw new InvalidTokenError('the token is not a signed-in user’s', {
          cause: claims.error,
        });
      }

      return claims.data;
    },
  };
}
