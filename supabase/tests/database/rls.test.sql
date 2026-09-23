-- Row-level security: a second user reaches nothing of the first's, through
-- any table or function, and an anonymous caller reaches nothing at all.

begin;

select plan(34);

-- Two users, `alice` and `bob`, and the claims a request of each carries.
insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', 'authenticated', 'authenticated');

create temporary table claims (who text primary key, value text) on commit drop;
insert into claims values
  ('alice', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}'),
  ('bob', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}');
grant select on claims to authenticated, anon;

-- Alice's data, written as Alice.
set local role authenticated;
select set_config('request.jwt.claims', (select value from claims where who = 'alice'), true);

insert into public.documents (id, title, content, tags)
values ('10000000-0000-0000-0000-000000000001', 'Alice''s notes', 'The secret is 42.', '{private}');

select ok(
  public.replace_document_chunks(
    '10000000-0000-0000-0000-000000000001',
    (select content_hash from public.documents where id = '10000000-0000-0000-0000-000000000001'),
    'test-model',
    jsonb_build_array(jsonb_build_object(
      'chunk_index', 0,
      'content', 'The secret is 42.',
      'heading_path', '{}'::text[],
      'embedding', array_fill(0.1, array[1536])::extensions.vector::text
    ))
  ),
  'the owner replaces her own document''s chunks'
);

insert into public.conversations (id, title)
values ('20000000-0000-0000-0000-000000000001', 'Alice asks');
insert into public.messages (conversation_id, role, content)
values ('20000000-0000-0000-0000-000000000001', 'user', 'What is the secret?');
insert into public.usage_events (kind, provider, model, prompt_tokens, completion_tokens)
values ('chat', 'test', 'test-model', 10, 5);

select is((select count(*)::integer from public.documents), 1, 'the owner sees her document');
select is((select count(*)::integer from public.document_chunks), 1, 'the owner sees her chunks');
select is(
  (select count(*)::integer from public.match_document_chunks(
    array_fill(0.1, array[1536])::extensions.vector, 'test-model', 5, 0)),
  1,
  'the owner''s search finds her chunk'
);
select is((select count(*)::integer from public.usage_by_day('2000-01-01')), 1, 'the owner sees her usage');
select is((select count(*)::integer from public.list_document_summaries()), 1, 'the owner sees her summaries');
select is((select count(*)::integer from public.list_document_tags()), 1, 'the owner sees her tags');

-- Bob, reading.
select set_config('request.jwt.claims', (select value from claims where who = 'bob'), true);

select is_empty('select * from public.documents', 'another user sees no documents');
select is_empty('select * from public.document_chunks', 'another user sees no chunks');
select is_empty(
  $$select * from public.match_document_chunks(
    array_fill(0.1, array[1536])::extensions.vector, 'test-model', 5, 0)$$,
  'another user''s search finds nothing'
);
select is_empty('select * from public.conversations', 'another user sees no conversations');
select is_empty('select * from public.messages', 'another user sees no messages');
select is_empty('select * from public.usage_events', 'another user sees no usage events');
select is_empty($$select * from public.usage_by_day('2000-01-01')$$, 'another user sees no usage totals');
select is_empty('select * from public.list_document_summaries()', 'another user sees no document summaries');
select is_empty('select * from public.list_document_tags()', 'another user sees no tags');

-- Bob, writing. An update or delete the policy filters out touches no row
-- rather than failing, so each is checked by its effect.
update public.documents set title = 'Bob was here'
where id = '10000000-0000-0000-0000-000000000001';
delete from public.documents where id = '10000000-0000-0000-0000-000000000001';
delete from public.document_chunks;
update public.conversations set title = 'Bob was here';
delete from public.conversations;

select ok(
  not public.replace_document_chunks(
    '10000000-0000-0000-0000-000000000001',
    md5('Alice''s notes' || E'\n' || 'The secret is 42.'),
    'test-model',
    '[]'::jsonb
  ),
  'another user cannot replace the chunks, even knowing the hash'
);

select throws_ok(
  $$insert into public.documents (user_id, title, content)
    values ('00000000-0000-0000-0000-00000000000a', 'Planted', 'x')$$,
  '42501',
  null,
  'another user cannot insert a document as the owner'
);
select throws_ok(
  $$insert into public.document_chunks
      (document_id, chunk_index, content, embedding, embedding_model)
    values ('10000000-0000-0000-0000-000000000001', 1, 'Planted',
      array_fill(0.1, array[1536])::extensions.vector, 'test-model')$$,
  '23503',
  null,
  'another user cannot attach a chunk to the owner''s document'
);
select throws_ok(
  $$insert into public.document_chunks
      (document_id, user_id, chunk_index, content, embedding, embedding_model)
    values ('10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-00000000000a', 1, 'Planted',
      array_fill(0.1, array[1536])::extensions.vector, 'test-model')$$,
  '42501',
  null,
  'another user cannot insert a chunk as the owner'
);
select throws_ok(
  $$insert into public.messages (conversation_id, role, content)
    values ('20000000-0000-0000-0000-000000000001', 'user', 'Planted')$$,
  '23503',
  null,
  'another user cannot post into the owner''s conversation'
);
select throws_ok(
  $$insert into public.messages (conversation_id, user_id, role, content)
    values ('20000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-00000000000a', 'user', 'Planted')$$,
  '42501',
  null,
  'another user cannot post as the owner'
);
select throws_ok(
  $$insert into public.usage_events (user_id, kind, provider, model)
    values ('00000000-0000-0000-0000-00000000000a', 'chat', 'test', 'test-model')$$,
  '42501',
  null,
  'another user cannot record usage against the owner'
);

-- Nobody, reading.
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select is_empty('select * from public.documents', 'an anonymous caller sees no documents');
select is_empty('select * from public.document_chunks', 'an anonymous caller sees no chunks');
select is_empty('select * from public.conversations', 'an anonymous caller sees no conversations');
select is_empty('select * from public.messages', 'an anonymous caller sees no messages');
select is_empty($$select * from public.usage_by_day('2000-01-01')$$, 'an anonymous caller sees no usage');

-- Alice again: everything Bob tried left her data as it was.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', (select value from claims where who = 'alice'), true);

select is(
  (select title from public.documents where id = '10000000-0000-0000-0000-000000000001'),
  'Alice''s notes',
  'the owner''s document survived another user''s update'
);
select is((select count(*)::integer from public.document_chunks), 1, 'the owner''s chunks survived');
select is(
  (select title from public.conversations where id = '20000000-0000-0000-0000-000000000001'),
  'Alice asks',
  'the owner''s conversation survived'
);
select is((select count(*)::integer from public.messages), 1, 'the owner''s messages survived');

-- The owner cannot hand her rows to someone else either.
select throws_ok(
  $$update public.documents set user_id = '00000000-0000-0000-0000-00000000000b'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the owner cannot move her document to another user'
);
select throws_ok(
  $$update public.conversations set user_id = '00000000-0000-0000-0000-00000000000b'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the owner cannot move her conversation to another user'
);

select * from finish();

rollback;
