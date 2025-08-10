-- Set immutable search_path on all custom functions
create or replace function public.validate_quiz_attempt()
returns trigger
language plpgsql
set search_path = public
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