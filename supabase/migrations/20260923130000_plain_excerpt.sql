-- A list row's excerpt is read as plain text, so the markdown's syntax is taken
-- out of it: the line markers of headings, quotes, list items and tables,
-- emphasis and code marks, and a link's target (its text stays). A best-effort
-- reading, not a parser — enough that an opening line reads as prose. Only the
-- opening is read, since only the opening is kept.
create function public.markdown_excerpt(markdown text, max_length integer)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select left(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(left(markdown, max_length * 8), '!?\[([^]]*)\]\([^)]*\)', '\1', 'g'),
                -- A table's divider row and a thematic break carry no words.
                '^[ \t]*[|:-][ \t|:-]*$', '', 'gn'
              ),
              '^[ \t]*(#{1,6}|>+|[-*+]|[0-9]+[.)])[ \t]+', '', 'gn'
            ),
            '[*`~]+', '', 'g'
          ),
          -- A cell border separates words.
          '\|', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    max_length
  );
$$;

create or replace function public.list_document_summaries(with_tag text default null)
returns table (
  id uuid,
  title text,
  excerpt text,
  tags text[],
  embedding_status public.embedding_status,
  embedding_error text,
  embedding_model text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    id,
    title,
    public.markdown_excerpt(content, 280),
    tags,
    embedding_status,
    embedding_error,
    embedding_model,
    created_at,
    updated_at
  from public.documents
  where with_tag is null or tags @> array[with_tag]
  order by updated_at desc;
$$;
