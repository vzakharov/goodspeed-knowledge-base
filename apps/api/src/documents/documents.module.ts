import { Module } from '@nestjs/common';

import { IngestionModule } from '../ingestion/index.ts';
import { DocumentsController } from './documents.controller.ts';
import { DocumentsService } from './documents.service.ts';

@Module({
  imports: [IngestionModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
