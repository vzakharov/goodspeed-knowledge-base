-- A user's documents: the text the knowledge base answers from.

create type public.embedding_status as enum ('pending', 'ready', 'failed');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) <= 200000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  -- What the chunks were computed from: the title is part of every embedded
  -- chunk, so renaming a document stales its embeddings just as editing it
  -- does. Ingestion writes its chunks only while this still matches the hash
  -- it read, so a slow run cannot overwrite a newer edit's.
  content_hash text generated always as (md5(title || E'\n' || content)) stored,
  embedding_status public.embedding_status not null default 'pending',
  -- Set exactly when the status is `failed`: what the provider or the store
  -- said, so the reader sees why rather than only that.
  embedding_error text,
  -- The model the current chunks were embedded with; null until the first
  -- successful run.
  embedding_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The target of the child tables' composite foreign keys, which is what
  -- keeps a chunk's denormalized `user_id` equal to its document's.
  unique (id, user_id),
  check ((embedding_status = 'failed') = (embedding_error is not null))
);

create index documents_user_updated_idx
  on public.documents (user_id, updated_at desc);
create index documents_tags_idx on public.documents using gin (tags);

-- `updated_at` is the reader's edit time, so ingestion writing its status does
-- not move it. An edit to what is embedded also sends the document back to
-- `pending`, so a status never describes content it was not computed from.
create function public.documents_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.title, new.content, new.tags)
    is distinct from (old.title, old.content, old.tags) then
    new.updated_at := now();
  end if;

  if (new.title, new.content) is distinct from (old.title, old.content) then
    new.embedding_status := 'pending';
    new.embedding_error := null;
  end if;

  return new;
end;
$$;

create trigger documents_before_update
  before update on public.documents
  for each row execute function public.documents_before_update();

alter table public.documents enable row level security;

-- One policy per operation, each scoped to the caller. `(select auth.uid())`
-- is evaluated once per statement rather than once per row.
create policy "documents: select own" on public.documents
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "documents: insert own" on public.documents
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "documents: update own" on public.documents
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "documents: delete own" on public.documents
  for delete to authenticated
  using (user_id = (select auth.uid()));
