create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  answers json,
  hidden_answers json,
  dominant_value text,
  secondary_value text,
  habits json,
  completed_onboarding boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists middle_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists answers json;
alter table public.profiles add column if not exists hidden_answers json;
alter table public.profiles add column if not exists habits json;
alter table public.profiles add column if not exists completed_onboarding boolean not null default false;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'survey_answers') then
    execute 'update public.profiles set answers = survey_answers where answers is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'initial_habits') then
    execute 'update public.profiles set habits = initial_habits where habits is null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_completed') then
    execute 'update public.profiles set completed_onboarding = onboarding_completed';
  end if;
end $$;

update public.profiles set user_id = id where user_id is null;
alter table public.profiles alter column user_id set not null;

alter table public.profiles drop column if exists email;
alter table public.profiles drop column if exists birth_date;
alter table public.profiles drop column if exists address;
alter table public.profiles drop column if exists nickname;
alter table public.profiles drop column if exists survey_answers;
alter table public.profiles drop column if exists initial_habits;
alter table public.profiles drop column if exists onboarding_completed;
alter table public.profiles drop column if exists onboarding_completed_at;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_fkey') then
    alter table public.profiles add constraint profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_key') then
    alter table public.profiles add constraint profiles_user_id_key unique (user_id);
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, user_id)
  values (new.id, new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

notify pgrst, 'reload schema';
