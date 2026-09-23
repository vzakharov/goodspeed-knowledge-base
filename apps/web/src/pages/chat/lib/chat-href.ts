import { withSearchParam } from '@/shared/lib/search-param';

/** The chat, on a conversation or — `null` — on a new one. */
export function chatHref(conversationId: string | null): string {
  return withSearchParam('/chat', 'c', conversationId);
}
