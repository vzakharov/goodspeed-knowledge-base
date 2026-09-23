-- Token usage: one row per model call, whichever feature made it.

create type public.usage_kind as enum ('chat', 'condense', 'embedding');

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  kind public.usage_kind not null,
  -- Both, since one model name can be served by several providers.
  provider text not null,
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

-- Totals per UTC day, kind, provider and model since a given day, newest
-- first. A function for the same reason as `list_document_summaries`.
create function public.usage_by_day(since date)
returns table (
  day date,
  kind public.usage_kind,
  provider text,
  model text,
  calls integer,
  -- Calls the provider reported no usage for, so a total is never read as
  -- complete when it is not.
  unreported_calls integer,
  prompt_tokens integer,
  completion_tokens integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (created_at at time zone 'utc')::date,
    kind,
    provider,
    model,
    count(*)::integer,
    count(*) filter (where prompt_tokens is null)::integer,
    coalesce(sum(prompt_tokens), 0)::integer,
    coalesce(sum(completion_tokens), 0)::integer
  from public.usage_events
  where created_at >= since::timestamp at time zone 'utc'
  group by 1, 2, 3, 4
  order by 1 desc, 2, 3, 4;
$$;
