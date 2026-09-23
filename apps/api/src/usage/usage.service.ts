import {
  type UsageKind,
  type UsageReport,
  usageWindowStart,
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

  async report(reader: Reader, now = new Date()): Promise<UsageReport> {
    const since = usageWindowStart(now);
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
