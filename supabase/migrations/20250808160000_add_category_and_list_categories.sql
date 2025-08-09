-- Add category column to questions and supporting helpers
alter table if exists public.questions
add column if not exists category text not null default 'General';

create index if not exists idx_questions_category on public.questions (category);

-- Helper: list distinct categories with question counts
create or replace function public.list_categories()
returns table (
  category text,
  question_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select category, count(*) as question_count
  from public.questions
  group by category
  order by category asc;
$$;


