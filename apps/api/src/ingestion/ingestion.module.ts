import { Module } from '@nestjs/common';

import { AiModule } from '../ai/index.ts';
import { UsageModule } from '../usage/index.ts';
import { IngestionService } from './ingestion.service.ts';

@Module({
  imports: [AiModule, UsageModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
