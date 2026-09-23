import { apiErrorSchema } from '@kb/contracts';
import type { z } from 'zod';

/** A response outside 2xx, carrying the API's own message when it sent one. */
export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

type ApiRequest = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Sent as the JSON body. */
  json?: unknown;
  signal?: AbortSignal;
};

type ApiClientOptions = {
  baseUrl: string;
  /** Read per request, so a refreshed token is the one sent. */
  accessToken: () => Promise<string | null>;
};

async function requestError(response: Response): Promise<ApiRequestError> {
  // A body that is not the API's error shape — a proxy's HTML page, say —
  // costs only the message; the error is raised either way.
  const body = apiErrorSchema.safeParse(
    await response.json().catch(() => null),
  );

  return new ApiRequestError(
    response.status,
    body.success ? body.data.message : response.statusText,
  );
}

export function createApiClient({ baseUrl, accessToken }: ApiClientOptions) {
  /** The raw response, once its status is known to be 2xx. */
  async function send(
    path: string,
    { method = 'GET', json, signal }: ApiRequest = {},
  ): Promise<Response> {
    const token = await accessToken();
    const headers = new Headers();
    if (token !== null) headers.set('Authorization', `Bearer ${token}`);
    if (json !== undefined) headers.set('Content-Type', 'application/json');

    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers,
      body: json === undefined ? null : JSON.stringify(json),
      signal: signal ?? null,
    });
    if (!response.ok) throw await requestError(response);

    return response;
  }

  /** The response body, parsed with the contract's schema. */
  async function request<Schema extends z.ZodType>(
    path: string,
    schema: Schema,
    init?: ApiRequest,
  ): Promise<z.infer<Schema>> {
    const response = await send(path, init);

    return schema.parse(await response.json());
  }

  return { send, request };
}
