import {
  type AnswerEvent,
  type Conversation,
  type ConversationDetail,
  type ConversationInput,
  conversationInputSchema,
  type ConversationList,
  idSchema,
  type QuestionInput,
  questionInputSchema,
} from '@kb/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { AiProviderError } from '../ai/index.ts';
import { CurrentReader, type Reader } from '../auth/index.ts';
import { toApiError } from '../http/error.filter.ts';
import { ZodPipe } from '../http/zod.pipe.ts';
import { AnswerService } from './answer.service.ts';
import { ConversationsService } from './conversations.service.ts';

const idPipe = new ZodPipe(idSchema);

function send(response: Response, event: AnswerEvent) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(
    private readonly conversations: ConversationsService,
    private readonly answers: AnswerService,
  ) {}

  @Get()
  async list(@CurrentReader() reader: Reader): Promise<ConversationList> {
    return this.conversations.list(reader);
  }

  @Post()
  async create(
    @CurrentReader() reader: Reader,
    @Body(new ZodPipe(conversationInputSchema)) input: ConversationInput,
  ): Promise<Conversation> {
    return this.conversations.create(reader, input);
  }

  @Get(':id')
  async get(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) id: string,
  ): Promise<ConversationDetail> {
    return this.conversations.get(reader, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.conversations.remove(reader, id);
  }

  /**
   * Answers a question as `text/event-stream` — `AnswerEvent`s, one per
   * `data:` line. Everything that can fail as plain HTTP does so before the
   * stream opens: a bad body is a 400 and a conversation that is not the
   * reader's a 404. After that the stream reports its own failure, as an
   * `error` event.
   *
   * A reader who goes away mid-answer cancels it: the provider request is
   * aborted, and nothing is stored.
   */
  @Post(':id/messages')
  async ask(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) conversationId: string,
    @Body(new ZodPipe(questionInputSchema)) { content }: QuestionInput,
    @Res() response: Response,
  ) {
    const history = await this.conversations.history(reader, conversationId);
    const cancel = new AbortController();

    response.on('close', () => {
      cancel.abort();
    });
    response.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tells a buffering reverse proxy to pass each event on as it comes.
      'X-Accel-Buffering': 'no',
    });

    try {
      for await (const event of this.answers.answer(
        reader,
        { conversationId, history, content },
        cancel.signal,
      )) {
        send(response, event);
      }
    } catch (error) {
      if (!cancel.signal.aborted) {
        // A provider's refusal is the reader's to act on, and says so in the
        // event; anything else is a fault here, and the log is where it goes.
        if (!(error instanceof AiProviderError)) {
          this.logger.error(error instanceof Error ? error.stack : error);
        }

        const { message } = toApiError(error);

        send(response, { type: 'error', message });
      }
    }

    response.end();
  }
}
