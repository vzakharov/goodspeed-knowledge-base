import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { APP_CONFIG } from '../config/config.module.ts';
import type { AppConfig } from '../config/env.ts';
import { AuthGuard, TOKEN_VERIFIER } from './auth.guard.ts';
import { createTokenVerifier } from './token-verifier.ts';

@Module({
  providers: [
    {
      provide: TOKEN_VERIFIER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        createTokenVerifier(config.supabase.url),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
