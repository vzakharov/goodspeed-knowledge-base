import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller.ts';
import { AuthModule } from './auth/index.ts';
import { ChatModule } from './chat/index.ts';
import { ConfigModule } from './config/config.module.ts';
import type { AppConfig } from './config/env.ts';
import { DocumentsModule } from './documents/index.ts';
import { ErrorFilter } from './http/error.filter.ts';
import { UsageModule } from './usage/index.ts';

@Module({})
export class AppModule {
  static create(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        AuthModule,
        DocumentsModule,
        ChatModule,
        UsageModule,
      ],
      controllers: [AppController],
      providers: [{ provide: APP_FILTER, useClass: ErrorFilter }],
    };
  }
}
