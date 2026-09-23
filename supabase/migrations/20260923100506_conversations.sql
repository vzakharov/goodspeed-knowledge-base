-- Chat history: a user's conversations and the turns in each.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  -- The time of the latest turn; the list is ordered by it.
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null default auth.uid(),
  role public.message_role not null,
  content text not null,
  -- The chunks an assistant turn cites, snapshotted rather than referenced:
  -- a chunk is replaced whenever its document is re-embedded, and the answer
  -- should still show what it was given. Shape: `@kb/contracts`' `Citation`.
  citations jsonb not null default '[]'
    check (jsonb_typeof(citations) = 'array'),
  -- The chat model that wrote an assistant turn; null on the user's own.
  model text,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id)
    references public.conversations (id, user_id) on delete cascade,
  check ((role = 'assistant') = (model is not null))
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create function public.messages_after_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;

  return null;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.messages_after_insert();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations: select own" on public.conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "conversations: insert own" on public.conversations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "conversations: update own" on public.conversations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "conversations: delete own" on public.conversations
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "messages: select own" on public.messages
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "messages: insert own" on public.messages
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- No update or delete policy: a turn is history. It goes when its
-- conversation does, through the cascade.
