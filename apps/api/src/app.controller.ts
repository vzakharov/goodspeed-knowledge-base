import type { AiSettings } from '@kb/contracts';
import { Controller, Get, Inject } from '@nestjs/common';

import type { ModelIdentity } from './ai/index.ts';
import { Public } from './auth/index.ts';
import { APP_CONFIG } from './config/config.module.ts';
import type { AppConfig } from './config/env.ts';

const identity = ({ provider, model }: ModelIdentity) => ({ provider, model });

@Controller()
export class AppController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /** Which models answer and embed — what the reader is shown, never a key. */
  @Get('settings/ai')
  aiSettings(): AiSettings {
    const { chat, embedding } = this.config;
    const { dimensions } = embedding;

    return {
      chat: identity(chat),
      embedding: { ...identity(embedding), dimensions },
    };
  }
}
