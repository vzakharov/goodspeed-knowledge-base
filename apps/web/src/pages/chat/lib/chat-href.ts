/** The chat, on a conversation or — `null` — on a new one. */
export function chatHref(conversationId: string | null): string {
  return conversationId === null
    ? '/chat'
    : `/chat?${new URLSearchParams({ c: conversationId })}`;
}
