import { type DynamicModule, Global, Module } from '@nestjs/common';

import type { AppConfig } from './env.ts';

export const APP_CONFIG = Symbol('AppConfig');

/**
 * Carries a configuration parsed before the app was built — `main.ts` parses
 * the environment, a test builds its own — so no module reads `process.env`.
 */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
