import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { APP_CONFIG } from '../config/config.module.ts';
import type { AppConfig } from '../config/env.ts';
import { createReaderDb, type Db } from '../database/database.ts';
import { InvalidTokenError, type TokenVerifier } from './token-verifier.ts';

export const TOKEN_VERIFIER = Symbol('TokenVerifier');

/**
 * The signed-in reader a request is made by, and the database as them. Row-
 * level security is what scopes every query `db` makes; a query that names
 * rows also filters on `userId`, so a policy dropped by mistake still leaves
 * no other reader's row reachable.
 */
export type Reader = {
  userId: string;
  db: Db;
};

type ReaderRequest = Request & { reader?: Reader };

const PUBLIC = Symbol('public');

/** Opens a route to callers who are not signed in. */
export const Public = () => SetMetadata(PUBLIC, true);

function bearerToken(header: string | undefined) {
  const match = /^bearer\s+(\S+)$/i.exec(header ?? '');

  return match?.[1];
}

/**
 * Registered for every route, so a new endpoint is private unless it is
 * `@Public()`. A request passes with a valid Supabase access token, and
 * `@CurrentReader()` hands its handler a reader whose database client holds
 * that token.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      PUBLIC,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ReaderRequest>();
    const token = bearerToken(request.headers.authorization);

    if (token === undefined) {
      throw new UnauthorizedException('Sign in: the request carries no token');
    }

    try {
      const { sub } = await this.verifier.verify(token);

      request.reader = {
        userId: sub,
        db: createReaderDb(this.config.supabase, token),
      };
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException(
          `Sign in again: the token is invalid (${error.message})`,
          { cause: error },
        );
      }

      throw error;
    }

    return true;
  }
}

export const CurrentReader = createParamDecorator(
  (_: unknown, context: ExecutionContext): Reader => {
    const { reader } = context.switchToHttp().getRequest<ReaderRequest>();

    // Only reachable from a route marked `@Public()`, where no guard ran.
    if (reader === undefined) {
      throw new Error('@CurrentReader() on a route with no signed-in reader');
    }

    return reader;
  },
);
