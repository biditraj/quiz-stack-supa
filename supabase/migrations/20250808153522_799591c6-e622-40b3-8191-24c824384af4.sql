-- Enable required extensions
create extension if not exists pgcrypto;

-- 1) Enum for question types
create type public.question_type as enum ('multiple_choice', 'true_false', 'fill_blank', 'image_based');

-- 2) Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Policies: users can read/update their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Insert handled via trigger below (no insert policy)

-- Trigger to auto-insert profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'user_' || substr(new.id::text, 1, 8)),
    new.email
  )
  on conflict (id) do nothing;

  -- Also assign a default 'user' role (created below) if the table exists
  begin
    insert into public.user_roles (user_id, role)
    values (new.id, 'user');
  exception when undefined_table then
    -- ignore if user_roles doesn't exist yet
    null;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) Roles system for admin-only operations
create type if not exists public.app_role as enum ('admin', 'moderator', 'user');

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can read their own roles" on public.user_roles
for select using (auth.uid() = user_id);

-- Do not create insert/update/delete policies to keep management restricted to triggers/service role/admin tooling

-- Helper function to check roles (SECURITY DEFINER to avoid recursive RLS issues)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

-- 4) Questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  type public.question_type not null,
  question_text text not null,
  options jsonb,
  correct_answer text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

-- Allow everyone to read questions (for gameplay)
create policy "Anyone can read questions"
  on public.questions for select using (true);

-- Only admins can write questions
create policy "Admins can insert questions"
  on public.questions for insert
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update questions"
  on public.questions for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete questions"
  on public.questions for delete
  using (public.has_role(auth.uid(), 'admin'));

-- 5) Quiz attempts table
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  accuracy double precision not null default 0,
  speed integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

-- Validation trigger for quiz_attempts
create or replace function public.validate_quiz_attempt()
returns trigger
language plpgsql
as $$
begin
  if NEW.score < 0 then
    raise exception 'score must be >= 0';
  end if;
  if NEW.accuracy < 0 or NEW.accuracy > 1 then
    raise exception 'accuracy must be between 0 and 1 (0.0 - 1.0)';
  end if;
  if NEW.speed < 0 then
    raise exception 'speed must be >= 0';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_validate_quiz_attempt on public.quiz_attempts;
create trigger trg_validate_quiz_attempt
before insert or update on public.quiz_attempts
for each row execute procedure public.validate_quiz_attempt();

-- RLS policies for quiz_attempts
create policy "Users can insert their own attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

-- 6) Leaderboard view
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  sum(a.score)::int as total_score,
  avg(a.accuracy)::float as avg_accuracy,
  avg(a.speed)::float as avg_speed,
  row_number() over (
    order by sum(a.score) desc, avg(a.accuracy) desc, avg(a.speed) asc
  ) as rank
from public.profiles p
join public.quiz_attempts a on a.user_id = p.id
group by p.id, p.username;

-- Helper: return top N leaderboard entries (default 10)
create or replace function public.leaderboard_top(limit_n int default 10)
returns table (
  user_id uuid,
  username text,
  total_score int,
  avg_accuracy double precision,
  avg_speed double precision,
  rank int
)
language sql
stable
security definer
set search_path = public
as $$
  select user_id, username, total_score, avg_accuracy, avg_speed, rank
  from public.leaderboard
  order by rank
  limit limit_n;
$$;

-- Helper: return N random questions without revealing answers
create or replace function public.get_random_questions(n int default 10)
returns table (
  id uuid,
  type public.question_type,
  question_text text,
  options jsonb,
  image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, type, question_text, options, image_url
  from public.questions
  order by random()
  limit n;
$$;
