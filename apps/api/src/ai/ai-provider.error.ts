import { APIError } from 'openai';

import type { ModelIdentity } from './models.ts';

/**
 * A model provider refused or failed a call. Kept apart from the API's own
 * failures because it is the one class of error a reader can act on — a key,
 * a model name, a quota — so its message says which provider and model, and
 * what they answered.
 */
export class AiProviderError extends Error {
  /** The provider's own HTTP status, where it answered at all. */
  readonly status: number | undefined;

  constructor(
    { provider, model }: ModelIdentity,
    detail: string,
    options: ErrorOptions & { status?: number } = {},
  ) {
    super(`${provider} (${model}): ${detail}`, options);
    this.name = 'AiProviderError';
    this.status = options.status;
  }

  /** Wraps whatever the SDK threw, keeping it as the cause. */
  static from(identity: ModelIdentity, error: unknown) {
    if (error instanceof AiProviderError) {
      return error;
    }

    if (error instanceof APIError) {
      const status =
        typeof error.status === 'number' ? error.status : undefined;

      return new AiProviderError(
        identity,
        status === undefined
          ? `unreachable — ${error.message}`
          : `answered ${status} — ${error.message}`,
        { cause: error, status },
      );
    }

    return new AiProviderError(
      identity,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}
