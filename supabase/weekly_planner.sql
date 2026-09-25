create table if not exists public.weekly_planner (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  task_id uuid references public.tasks(id) on delete cascade,
  habit_id text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'failed', 'moved')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint weekly_planner_valid_time check (end_time > start_time)
);

create index if not exists weekly_planner_user_date_idx on public.weekly_planner(user_id, date, start_time);
create unique index if not exists weekly_planner_review_idx on public.weekly_planner(user_id, date) where task_id is null and habit_id is null;
alter table public.weekly_planner enable row level security;

drop policy if exists "Users can read their own weekly planner" on public.weekly_planner;
create policy "Users can read their own weekly planner" on public.weekly_planner for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own weekly planner" on public.weekly_planner;
create policy "Users can create their own weekly planner" on public.weekly_planner for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own weekly planner" on public.weekly_planner;
create policy "Users can update their own weekly planner" on public.weekly_planner for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own weekly planner" on public.weekly_planner;
create policy "Users can delete their own weekly planner" on public.weekly_planner for delete to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';