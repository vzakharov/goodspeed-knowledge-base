import type { ApiError } from '@kb/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { AiProviderError } from '../ai/ai-provider.error.ts';

const REASON_PHRASES: Partial<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
};

function httpMessage(exception: HttpException) {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  const message = 'message' in response ? response.message : undefined;

  if (Array.isArray(message)) {
    return message.map(String).join('; ');
  }

  return typeof message === 'string' ? message : exception.message;
}

/** Every error response in one shape, `@kb/contracts`' `ApiError`. */
export function toApiError(exception: unknown): ApiError {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();

    return {
      statusCode,
      error: REASON_PHRASES[statusCode] ?? 'Error',
      message: httpMessage(exception),
    };
  }

  // A reader can act on a provider's refusal — a key, a model name, a quota —
  // so its message goes out whole. It is the API's configuration, not a secret.
  if (exception instanceof AiProviderError) {
    return {
      statusCode: HttpStatus.BAD_GATEWAY,
      error: 'Bad Gateway',
      message: `The model provider failed: ${exception.message}`,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'Internal Server Error',
    message: 'Something failed on the server; its log has the details.',
  };
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = toApiError(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : exception,
      );
    }

    // A stream already under way reports its own failure in-band; all that is
    // left to do here is to end it.
    if (response.headersSent) {
      response.end();

      return;
    }

    response.status(body.statusCode).json(body);
  }
}
