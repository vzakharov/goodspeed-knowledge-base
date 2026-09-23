import 'reflect-metadata';

import { DOCUMENT_LIMITS } from '@kb/contracts';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.ts';
import type { AppConfig } from './config/env.ts';

// The largest document body, encoded, with room for the rest of the request.
const BODY_LIMIT = `${Math.ceil((DOCUMENT_LIMITS.content * 4) / 1024 / 1024) + 1}mb`;

/** The API as `main.ts` serves it and a test drives it, from one configuration. */
export async function createApp(config: AppConfig) {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.create(config),
    { bodyParser: false },
  );

  app.useBodyParser('json', { limit: BODY_LIMIT });
  app.enableCors({
    origin: config.webOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });
  app.enableShutdownHooks();

  return app;
}
