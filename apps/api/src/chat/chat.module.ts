import { Module } from '@nestjs/common';

import { AiModule } from '../ai/index.ts';
import { UsageModule } from '../usage/index.ts';
import { AnswerService } from './answer.service.ts';
import { ConversationsController } from './conversations.controller.ts';
import { ConversationsService } from './conversations.service.ts';

@Module({
  imports: [AiModule, UsageModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, AnswerService],
})
export class ChatModule {}
