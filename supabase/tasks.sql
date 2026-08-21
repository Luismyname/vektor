create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium',
  status text not null default 'pending',
  related_value text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  duration integer,
  created_at timestamptz not null default now()
);

alter table public.activity add column if not exists duration integer;

alter table public.tasks enable row level security;
alter table public.activity enable row level security;

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks" on public.tasks for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks" on public.tasks for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks" on public.tasks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks" on public.tasks for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can read their own activity" on public.activity;
create policy "Users can read their own activity" on public.activity for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own activity" on public.activity;
create policy "Users can create their own activity" on public.activity for insert to authenticated with check (auth.uid() = user_id);

notify pgrst, 'reload schema';