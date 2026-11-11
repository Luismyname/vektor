begin;

create table if not exists public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  obligation_type text not null check (obligation_type in ('work', 'class', 'sleep', 'appointment')),
  active boolean not null default true,
  timezone text not null default 'UTC',
  recurrence_rule jsonb not null check (
    jsonb_typeof(recurrence_rule) = 'object'
    and recurrence_rule ? 'frequency'
    and recurrence_rule->>'frequency' in ('once', 'weekly')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists obligations_id_user_unique
  on public.obligations(id, user_id);

create index if not exists obligations_user_active_idx
  on public.obligations(user_id, active);

alter table public.obligations enable row level security;

drop policy if exists "Users can read their own obligations" on public.obligations;
create policy "Users can read their own obligations"
  on public.obligations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own obligations" on public.obligations;
create policy "Users can create their own obligations"
  on public.obligations for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own obligations" on public.obligations;
create policy "Users can update their own obligations"
  on public.obligations for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own obligations" on public.obligations;
create policy "Users can delete their own obligations"
  on public.obligations for delete to authenticated
  using (auth.uid() = user_id);

alter table public.weekly_planner
  add column if not exists obligation_id uuid;

alter table public.weekly_planner
  add column if not exists obligation_occurrence_date date;

alter table public.weekly_planner
  drop constraint if exists weekly_planner_obligation_id_fkey;

alter table public.weekly_planner
  drop constraint if exists weekly_planner_obligation_user_fkey;

alter table public.weekly_planner
  add constraint weekly_planner_obligation_user_fkey
  foreign key (obligation_id, user_id)
  references public.obligations(id, user_id)
  on delete restrict
  not valid;

alter table public.weekly_planner
  validate constraint weekly_planner_obligation_user_fkey;

alter table public.weekly_planner
  drop constraint if exists weekly_planner_entry_type_exclusive;

alter table public.weekly_planner
  add constraint weekly_planner_entry_type_exclusive
  check (
    (task_id is not null)::integer
    + (habit_id is not null)::integer
    + (obligation_id is not null)::integer
    <= 1
  ) not valid;

alter table public.weekly_planner
  validate constraint weekly_planner_entry_type_exclusive;

alter table public.weekly_planner
  drop constraint if exists weekly_planner_obligation_occurrence_pair;

alter table public.weekly_planner
  add constraint weekly_planner_obligation_occurrence_pair
  check (
    (obligation_id is null and obligation_occurrence_date is null)
    or (obligation_id is not null and obligation_occurrence_date is not null)
  ) not valid;

alter table public.weekly_planner
  validate constraint weekly_planner_obligation_occurrence_pair;

alter table public.weekly_planner
  drop constraint if exists weekly_planner_valid_time;

alter table public.weekly_planner
  add constraint weekly_planner_valid_time
  check (
    end_time > start_time
    or (obligation_id is not null and end_time < start_time)
  ) not valid;

alter table public.weekly_planner
  validate constraint weekly_planner_valid_time;

drop index if exists public.weekly_planner_review_idx;

create unique index if not exists weekly_planner_obligation_occurrence_idx
  on public.weekly_planner(obligation_id, obligation_occurrence_date)
  where obligation_id is not null;

notify pgrst, 'reload schema';

commit;
