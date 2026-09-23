-- Token usage: one row per model call, whichever feature made it.

create type public.usage_kind as enum ('chat', 'condense', 'embedding');

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  kind public.usage_kind not null,
  model text not null,
  -- Null where the provider reported no usage for the call, which is not the
  -- same as zero tokens.
  prompt_tokens integer check (prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens >= 0),
  created_at timestamptz not null default now()
);

create index usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

create policy "usage_events: select own" on public.usage_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "usage_events: insert own" on public.usage_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- No update or delete policy: the record is append-only.

-- Totals per UTC day, kind and model. `security_invoker` makes the view read
-- through the caller's policies rather than its owner's.
create view public.usage_daily
with (security_invoker = true)
as
select
  (created_at at time zone 'utc')::date as day,
  kind,
  model,
  count(*)::integer as calls,
  -- Calls the provider reported no usage for, so a total is never read as
  -- complete when it is not.
  count(*) filter (where prompt_tokens is null)::integer as unreported_calls,
  coalesce(sum(prompt_tokens), 0)::integer as prompt_tokens,
  coalesce(sum(completion_tokens), 0)::integer as completion_tokens
from public.usage_events
group by 1, 2, 3;
