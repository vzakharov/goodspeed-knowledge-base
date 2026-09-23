-- A document's embedding lifecycle: what an edit does to its status and its
-- timestamps, and why a stale ingestion run cannot land.

begin;

select plan(12);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', 'authenticated', 'authenticated');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}',
  true
);

insert into public.documents (id, title, content, tags, created_at, updated_at)
values (
  '10000000-0000-0000-0000-000000000001',
  'Notes', 'First draft.', '{draft}',
  now() - interval '1 day', now() - interval '1 day'
);

select is(
  (select embedding_status::text from public.documents),
  'pending',
  'a new document waits to be embedded'
);

create temporary table first_hash on commit drop as
select content_hash as value from public.documents;

select ok(
  public.replace_document_chunks(
    '10000000-0000-0000-0000-000000000001',
    (select value from first_hash),
    'test-model',
    jsonb_build_array(
      jsonb_build_object(
        'chunk_index', 0, 'content', 'First', 'heading_path', '{}'::text[],
        'embedding', array_fill(0.1, array[1536])::extensions.vector::text),
      jsonb_build_object(
        'chunk_index', 1, 'content', 'draft.', 'heading_path', '{Intro}'::text[],
        'embedding', array_fill(0.2, array[1536])::extensions.vector::text)
    )
  ),
  'chunks computed from the current content land'
);

select results_eq(
  $$select embedding_status::text, embedding_model, updated_at < now() - interval '1 hour'
    from public.documents$$,
  $$values ('ready', 'test-model', true)$$,
  'landing them marks the document ready without moving its edit time'
);
select is((select count(*)::integer from public.document_chunks), 2, 'both chunks are stored');

-- Tags are not embedded.
update public.documents set tags = '{draft,work}';
select results_eq(
  $$select embedding_status::text, updated_at > now() - interval '1 hour'
    from public.documents$$,
  $$values ('ready', true)$$,
  'retagging moves the edit time and keeps the embeddings'
);

-- The title is.
update public.documents set title = 'Better notes';
select is(
  (select embedding_status::text from public.documents),
  'pending',
  'renaming sends the document back to pending'
);
select isnt(
  (select content_hash from public.documents),
  (select value from first_hash),
  'renaming changes the content hash'
);

select ok(
  not public.replace_document_chunks(
    '10000000-0000-0000-0000-000000000001',
    (select value from first_hash),
    'test-model',
    '[]'::jsonb
  ),
  'a run computed from the previous content does not land'
);
select is(
  (select count(*)::integer from public.document_chunks),
  2,
  'and leaves the stored chunks alone'
);

select throws_ok(
  $$update public.documents set embedding_status = 'failed'$$,
  '23514',
  null,
  'a failure has to say why'
);

update public.documents
set embedding_status = 'failed', embedding_error = 'provider unreachable';
update public.documents set content = 'Second draft.';
select results_eq(
  $$select embedding_status::text, embedding_error from public.documents$$,
  $$values ('pending', null::text)$$,
  'an edit after a failure clears the error along with the status'
);

delete from public.documents;
select is_empty('select * from public.document_chunks', 'deleting a document deletes its chunks');

select * from finish();

rollback;
