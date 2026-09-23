-- A list row's excerpt: the document's opening as plain text.

begin;

select plan(7);

select is(
  public.markdown_excerpt(E'# Onboarding\n\nEverything a new engineer **needs**.', 280),
  'Onboarding Everything a new engineer needs.',
  'heading markers and emphasis are taken out'
);

select is(
  public.markdown_excerpt(E'- GitHub, with 2FA\n* Supabase\n1. Read `docs/runbook.md`', 280),
  'GitHub, with 2FA Supabase Read docs/runbook.md',
  'list markers and code marks are taken out'
);

select is(
  public.markdown_excerpt(E'> Ask in [the channel](https://example.com) when stuck.', 280),
  'Ask in the channel when stuck.',
  'a quote marker and a link target are taken out, the link text kept'
);

select is(
  public.markdown_excerpt(E'| Day | Goal |\n| --- | :-: |\n| 1 | Run it |\n\n---\n\nEnd', 280),
  'Day Goal 1 Run it End',
  'a table keeps its cells and loses its divider, as a break does'
);

select is(
  public.markdown_excerpt('snake_case and 3 - 2 stay as written', 280),
  'snake_case and 3 - 2 stay as written',
  'marks inside a line that are not markup are kept'
);

select is(
  public.markdown_excerpt(repeat('word ', 100), 12),
  'word word wo',
  'the excerpt is cut to the length asked for'
);

select is(public.markdown_excerpt('', 280), '', 'an empty body has an empty excerpt');

select * from finish();

rollback;
