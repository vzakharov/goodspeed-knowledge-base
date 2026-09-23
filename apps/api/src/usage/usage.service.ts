import {
  USAGE_WINDOW_DAYS,
  type UsageKind,
  type UsageReport,
} from '@kb/contracts';
import { Injectable } from '@nestjs/common';

import type { ModelIdentity, PromptTokens } from '../ai/index.ts';
import type { Reader } from '../auth/index.ts';
import { rows } from '../database/database.ts';

/** One model call's cost, as the provider reported it — null where it reported none. */
export type UsageRecord = ModelIdentity & {
  kind: UsageKind;
  promptTokens: number | null;
  completionTokens: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UsageService {
  async record(
    reader: Reader,
    { kind, provider, model, promptTokens, completionTokens }: UsageRecord,
  ) {
    rows(
      await reader.db.from('usage_events').insert({
        kind,
        provider,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      }),
    );
  }

  /** An embedding call — it reports input tokens only. */
  async recordEmbedding(
    reader: Reader,
    identity: ModelIdentity,
    usage: PromptTokens | null,
  ) {
    return this.record(reader, {
      ...identity,
      kind: 'embedding',
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: null,
    });
  }

  /** The last `USAGE_WINDOW_DAYS` UTC days, today included. */
  async report(reader: Reader, now = new Date()): Promise<UsageReport> {
    const since = new Date(now.getTime() - (USAGE_WINDOW_DAYS - 1) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const days = rows(await reader.db.rpc('usage_by_day', { since }));

    return {
      days: days.map(
        ({
          unreported_calls: unreportedCalls,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          ...day
        }) => ({ ...day, unreportedCalls, promptTokens, completionTokens }),
      ),
    };
  }
}
