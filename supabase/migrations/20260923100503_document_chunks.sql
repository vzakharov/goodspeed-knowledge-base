-- The retrieval index: each document split into chunks, each chunk embedded.

create extension if not exists vector with schema extensions;

create table public.document_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null,
  -- Denormalized from the document so the policy and the search filter read
  -- one table; the composite key below is what holds it equal.
  user_id uuid not null default auth.uid(),
  chunk_index integer not null check (chunk_index >= 0),
  -- The chunk's own text, as shown in a citation. What was embedded is this
  -- prefixed with the document title and `heading_path`.
  content text not null check (char_length(content) > 0),
  -- The headings the chunk sits under, outermost first.
  heading_path text[] not null default '{}',
  -- The dimension is the embedding model's: `EMBEDDING_DIMENSIONS` in the API
  -- must match it, and the API refuses to start when it does not.
  embedding extensions.vector(1536) not null,
  -- Vectors from two models share no space, so search compares only chunks
  -- embedded by the model the query was.
  embedding_model text not null,
  foreign key (document_id, user_id)
    references public.documents (id, user_id) on delete cascade,
  unique (document_id, chunk_index)
);

-- The column's dimension, which the API compares with its configured model's
-- at boot and refuses to start on a mismatch — a model that disagrees with
-- the column would otherwise fail every write and every search, one request
-- at a time.
create function public.embedding_dimensions()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select atttypmod
  from pg_catalog.pg_attribute
  where attrelid = 'public.document_chunks'::regclass and attname = 'embedding';
$$;

create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index document_chunks_user_idx on public.document_chunks (user_id);

alter table public.document_chunks enable row level security;

create policy "document_chunks: select own" on public.document_chunks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "document_chunks: insert own" on public.document_chunks
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- No update policy: a chunk is replaced, never edited.

create policy "document_chunks: delete own" on public.document_chunks
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Swaps a document's chunks for a fresh set in one transaction, and marks it
-- ready. Applies only while the document still has the content the chunks
-- were computed from — `false` means it was edited meanwhile, and the run that
-- edit started owns the result.
--
-- `security invoker`: the caller's policies decide which document it can see,
-- so another user's id is indistinguishable from a missing one.
create function public.replace_document_chunks(
  target_document_id uuid,
  expected_content_hash text,
  model text,
  chunks jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1
  from public.documents
  where id = target_document_id and content_hash = expected_content_hash
  for update;

  if not found then
    return false;
  end if;

  delete from public.document_chunks where document_id = target_document_id;

  insert into public.document_chunks
    (document_id, chunk_index, content, heading_path, embedding, embedding_model)
  select
    target_document_id,
    chunk.chunk_index,
    chunk.content,
    chunk.heading_path,
    chunk.embedding::extensions.vector,
    model
  from jsonb_to_recordset(chunks) as chunk (
    chunk_index integer,
    content text,
    heading_path text[],
    embedding text
  );

  update public.documents
  set embedding_status = 'ready', embedding_error = null, embedding_model = model
  where id = target_document_id;

  return true;
end;
$$;

-- The nearest chunks to a query embedding, most similar first, among the
-- caller's own documents.
--
-- `security invoker`, so the caller's row-level security is the scope and no
-- argument names a user. The search runs over one HNSW index shared by every
-- user, which is why iterative scan is on: without it the index hands back
-- `ef_search` candidates before the policy filters them, and a user whose
-- chunks are a small share of the table gets fewer matches than asked for.
-- `relaxed_order` can return them slightly out of order, hence the outer sort.
create function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  model text,
  match_count integer default 8,
  min_similarity double precision default 0.2
)
returns table (
  id bigint,
  document_id uuid,
  document_title text,
  chunk_index integer,
  content text,
  heading_path text[],
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
set hnsw.iterative_scan = 'relaxed_order'
as $$
  select * from (
    select
      chunk.id,
      chunk.document_id,
      document.title,
      chunk.chunk_index,
      chunk.content,
      chunk.heading_path,
      1 - (chunk.embedding operator(extensions.<=>) query_embedding) as similarity
    from public.document_chunks as chunk
    join public.documents as document on document.id = chunk.document_id
    where chunk.embedding_model = model
    order by chunk.embedding operator(extensions.<=>) query_embedding
    limit least(match_count, 50)
  ) as nearest
  where nearest.similarity >= min_similarity
  order by nearest.similarity desc;
$$;
