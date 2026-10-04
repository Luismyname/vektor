create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  planned_duration_seconds integer not null check (planned_duration_seconds >= 0),
  started_at timestamptz not null default clock_timestamp(),
  paused_at timestamptz,
  paused_seconds integer not null default 0 check (paused_seconds >= 0),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'running'
    check (status in ('running', 'paused', 'completed', 'interrupted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint focus_sessions_status_times check (
    (status = 'running' and paused_at is null and ended_at is null)
    or (status = 'paused' and paused_at is not null and ended_at is null)
    or (status in ('completed', 'interrupted') and paused_at is null and ended_at is not null)
  )
);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);

create unique index if not exists focus_sessions_one_active_per_user_idx
  on public.focus_sessions (user_id)
  where status in ('running', 'paused');

create or replace function public.track_focus_session_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  transition_time timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.status <> 'running' or new.paused_at is not null or new.ended_at is not null then
      raise exception 'A focus session must start in running state';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status not in ('running', 'paused') then
    raise exception 'A finished focus session cannot be changed';
  end if;

  if new.status = 'paused' and old.status = 'running' then
    new.paused_at := transition_time;
  elsif new.status = 'running' and old.status = 'paused' then
    new.paused_seconds := old.paused_seconds
      + greatest(floor(extract(epoch from (transition_time - old.paused_at)))::integer, 0);
    new.paused_at := null;
  elsif new.status in ('completed', 'interrupted') then
    if old.status = 'paused' then
      new.paused_seconds := old.paused_seconds
        + greatest(floor(extract(epoch from (transition_time - old.paused_at)))::integer, 0);
    end if;
    new.paused_at := null;
    new.ended_at := transition_time;
    new.duration_seconds := greatest(
      floor(extract(epoch from (transition_time - old.started_at)))::integer - new.paused_seconds,
      0
    );
  else
    raise exception 'Invalid focus session transition: % to %', old.status, new.status;
  end if;

  new.updated_at := transition_time;
  return new;
end;
$$;

drop trigger if exists focus_sessions_track_insert on public.focus_sessions;
create trigger focus_sessions_track_insert
  before insert on public.focus_sessions
  for each row execute function public.track_focus_session_transition();

drop trigger if exists focus_sessions_track_transition on public.focus_sessions;
create trigger focus_sessions_track_transition
  before update of status on public.focus_sessions
  for each row execute function public.track_focus_session_transition();

alter table public.focus_sessions enable row level security;

drop policy if exists "Users can read their own focus sessions" on public.focus_sessions;
create policy "Users can read their own focus sessions"
  on public.focus_sessions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own focus sessions" on public.focus_sessions;
create policy "Users can create their own focus sessions"
  on public.focus_sessions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can transition their own active focus sessions" on public.focus_sessions;
create policy "Users can transition their own active focus sessions"
  on public.focus_sessions for update to authenticated
  using (auth.uid() = user_id and status in ('running', 'paused'))
  with check (auth.uid() = user_id);

grant select, insert, update on public.focus_sessions to authenticated;

create table if not exists public.habit_status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planner_entry_id uuid references public.weekly_planner(id) on delete set null,
  habit_id text not null,
  habit_title text not null,
  planned_date date not null,
  previous_status text
    check (previous_status is null or previous_status in ('scheduled', 'completed', 'failed', 'moved')),
  status text not null check (status in ('scheduled', 'completed', 'failed', 'moved')),
  event_type text not null check (event_type in ('scheduled', 'status_changed', 'baseline')),
  changed_at timestamptz not null default clock_timestamp()
);

create index if not exists habit_status_history_user_changed_idx
  on public.habit_status_history (user_id, changed_at desc);

create index if not exists habit_status_history_user_habit_date_idx
  on public.habit_status_history (user_id, habit_id, planned_date);

create unique index if not exists habit_status_history_baseline_entry_idx
  on public.habit_status_history (planner_entry_id)
  where event_type = 'baseline' and planner_entry_id is not null;

create or replace function public.log_habit_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_habit_title text;
  prior_status text;
  history_event_type text;
begin
  if new.habit_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then
      return new;
    end if;
  end if;

  select habit_record.item->>'title'
    into resolved_habit_title
    from public.profiles profile
    cross join lateral (
      select json_array_elements(coalesce(profile.habits->'recommended', '[]'::json)) as item
      union all
      select json_array_elements(coalesce(profile.habits->'custom', '[]'::json)) as item
    ) habit_record
    where profile.user_id = new.user_id
      and coalesce(habit_record.item->>'id', habit_record.item->>'title') = new.habit_id
    limit 1;

  if tg_op = 'INSERT' then
    prior_status := null;
    history_event_type := 'scheduled';
  else
    prior_status := old.status;
    history_event_type := 'status_changed';
  end if;

  insert into public.habit_status_history (
    user_id,
    planner_entry_id,
    habit_id,
    habit_title,
    planned_date,
    previous_status,
    status,
    event_type
  ) values (
    new.user_id,
    new.id,
    new.habit_id,
    coalesce(resolved_habit_title, new.habit_id),
    new.date,
    prior_status,
    new.status,
    history_event_type
  );

  return new;
end;
$$;

drop trigger if exists weekly_planner_log_habit_insert on public.weekly_planner;
create trigger weekly_planner_log_habit_insert
  after insert on public.weekly_planner
  for each row execute function public.log_habit_status_history();

drop trigger if exists weekly_planner_log_habit_status on public.weekly_planner;
create trigger weekly_planner_log_habit_status
  after update of status on public.weekly_planner
  for each row execute function public.log_habit_status_history();

alter table public.habit_status_history enable row level security;

drop policy if exists "Users can read their own habit status history" on public.habit_status_history;
create policy "Users can read their own habit status history"
  on public.habit_status_history for select to authenticated
  using (auth.uid() = user_id);

grant select on public.habit_status_history to authenticated;

insert into public.habit_status_history (
  user_id,
  planner_entry_id,
  habit_id,
  habit_title,
  planned_date,
  previous_status,
  status,
  event_type
)
select
  planner.user_id,
  planner.id,
  planner.habit_id,
  coalesce(habit_record.item->>'title', planner.habit_id),
  planner.date,
  null,
  planner.status,
  'baseline'
from public.weekly_planner planner
left join public.profiles profile on profile.user_id = planner.user_id
left join lateral (
  select json_array_elements(coalesce(profile.habits->'recommended', '[]'::json)) as item
  union all
  select json_array_elements(coalesce(profile.habits->'custom', '[]'::json)) as item
) habit_record on coalesce(habit_record.item->>'id', habit_record.item->>'title') = planner.habit_id
where planner.habit_id is not null
on conflict do nothing;

notify pgrst, 'reload schema';