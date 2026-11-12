create extension if not exists pg_cron;

begin;

create table if not exists public.planner_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_entry_id uuid not null references public.weekly_planner(id) on delete cascade,
  conflicting_entry_id uuid references public.weekly_planner(id) on delete set null,
  source_title text not null default 'Obligación',
  source_type text not null default 'Obligación',
  conflicting_title text not null default 'Actividad',
  conflicting_type text not null default 'Actividad',
  status text not null default 'pending'
    check (status in ('pending', 'manual', 'automatic', 'resolved', 'backlog', 'unscheduled', 'dismissed')),
  detected_at timestamptz not null default now(),
  grace_until timestamptz,
  resolution_message text,
  resolved_at timestamptz,
  unique (source_entry_id, conflicting_entry_id),
  check (source_entry_id <> conflicting_entry_id)
);

create index if not exists planner_conflicts_user_status_idx
  on public.planner_conflicts (user_id, status);
create index if not exists planner_conflicts_user_detected_idx
  on public.planner_conflicts (user_id, detected_at desc);
create index if not exists planner_conflicts_source_idx
  on public.planner_conflicts (source_entry_id, status);
create index if not exists planner_conflicts_affected_entry_idx
  on public.planner_conflicts (conflicting_entry_id)
  where conflicting_entry_id is not null;
create index if not exists weekly_planner_user_habit_date_idx
  on public.weekly_planner (user_id, habit_id, date)
  where habit_id is not null;

alter table public.planner_conflicts enable row level security;

drop policy if exists "Users can read their own planner conflicts" on public.planner_conflicts;
create policy "Users can read their own planner conflicts"
  on public.planner_conflicts for select to authenticated
  using (auth.uid() = user_id);

grant select on public.planner_conflicts to authenticated;

create or replace function public.enforce_planner_single_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_start timestamp;
  candidate_end timestamp;
  has_conflict boolean;
  obligation_type text;
begin
  if tg_op = 'UPDATE'
    and new.date is not distinct from old.date
    and new.start_time is not distinct from old.start_time
    and new.end_time is not distinct from old.end_time
    and new.task_id is not distinct from old.task_id
    and new.habit_id is not distinct from old.habit_id
    and new.obligation_id is not distinct from old.obligation_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if new.habit_id is not null and exists (
    select 1
    from public.weekly_planner existing
    where existing.user_id = new.user_id
      and existing.habit_id = new.habit_id
      and existing.date = new.date
      and existing.id is distinct from new.id
  ) then
    raise exception 'Este hábito ya está programado para ese día.'
      using errcode = '23505', constraint = 'weekly_planner_habit_daily_unique';
  end if;

  candidate_start := new.date + new.start_time;
  select obligation.obligation_type into obligation_type
  from public.obligations obligation
  where obligation.id = new.obligation_id
    and obligation.user_id = new.user_id;
  candidate_end := new.date + new.end_time
    + case
        when obligation_type = 'sleep' and new.end_time < new.start_time
          then interval '1 day'
        else interval '0'
      end;
  if candidate_end <= candidate_start then
    raise exception 'La actividad debe finalizar después de su inicio dentro del mismo día.'
      using errcode = '22007';
  end if;

  if new.obligation_id is not null then
    select exists (
      select 1
      from public.weekly_planner existing
      left join public.obligations existing_obligation
        on existing_obligation.id = existing.obligation_id
       and existing_obligation.user_id = existing.user_id
      where existing.user_id = new.user_id
        and existing.obligation_id is not null
        and existing.id is distinct from new.id
        and candidate_start < (
          existing.date + existing.end_time
          + case
              when existing_obligation.obligation_type = 'sleep'
                and existing.end_time < existing.start_time
              then interval '1 day'
              else interval '0'
            end
        )
        and (existing.date + existing.start_time) < candidate_end
    ) into has_conflict;
    if has_conflict then
      raise exception 'La franja ya contiene otra obligación.'
        using errcode = '23P01', constraint = 'weekly_planner_no_overlapping_obligations';
    end if;
    return new;
  end if;

  select exists (
    select 1
    from public.weekly_planner existing
    left join public.obligations obligation
      on obligation.id = existing.obligation_id
     and obligation.user_id = existing.user_id
    where existing.user_id = new.user_id
      and existing.id is distinct from new.id
      and candidate_start < (
        existing.date + existing.end_time
        + case
            when obligation.obligation_type = 'sleep'
              and existing.end_time < existing.start_time
            then interval '1 day'
            else interval '0'
          end
      )
      and (existing.date + existing.start_time) < candidate_end
  ) into has_conflict;

  if has_conflict then
    raise exception 'La franja ya está ocupada. Elige un horario sin solapamientos.'
      using errcode = '23P01', constraint = 'weekly_planner_no_overlapping_activities';
  end if;

  return new;
end;
$$;

drop trigger if exists weekly_planner_single_activity on public.weekly_planner;
create trigger weekly_planner_single_activity
  before insert or update of date, start_time, end_time, task_id, habit_id, obligation_id
  on public.weekly_planner
  for each row execute function public.enforce_planner_single_activity();

create or replace function public.capture_planner_obligation_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  obligation_end timestamp;
begin
  if new.obligation_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.date is not distinct from old.date
      and new.start_time is not distinct from old.start_time
      and new.end_time is not distinct from old.end_time
      and new.obligation_id is not distinct from old.obligation_id then
      return new;
    end if;
    update public.planner_conflicts conflict
       set status = 'resolved',
           resolved_at = now(),
           grace_until = null,
           resolution_message = 'La obligación cambió y el solapamiento anterior ya no está activo.'
     where conflict.user_id = new.user_id
       and conflict.source_entry_id = new.id
       and conflict.status not in ('resolved', 'dismissed')
       and not exists (
         select 1
         from public.weekly_planner other
         left join public.obligations other_obligation
           on other_obligation.id = other.obligation_id
          and other_obligation.user_id = other.user_id
         where other.user_id = new.user_id
           and other.id = conflict.conflicting_entry_id
           and (new.date + new.start_time) < (
             other.date + other.end_time
             + case
                 when other_obligation.obligation_type = 'sleep'
                   and other.end_time < other.start_time
                 then interval '1 day'
                 else interval '0'
               end
           )
           and (other.date + other.start_time) < (
             new.date + new.end_time
             + case when new.end_time < new.start_time then interval '1 day' else interval '0' end
           )
       );
  end if;

  obligation_end := new.date + new.end_time
    + case when new.end_time < new.start_time then interval '1 day' else interval '0' end;

  insert into public.planner_conflicts (
    user_id,
    source_entry_id,
    conflicting_entry_id,
    source_title,
    source_type,
    conflicting_title,
    conflicting_type,
    status,
    detected_at,
    grace_until,
    resolution_message,
    resolved_at
  )
  select
    new.user_id,
    new.id,
    other.id,
    coalesce(
      (select title from public.obligations where id = new.obligation_id and user_id = new.user_id),
      'Obligación'
    ),
    'Obligación',
    case
      when other.task_id is not null then coalesce((
        select title from public.tasks where id = other.task_id and user_id = other.user_id
      ), 'Tarea')
      when other.habit_id is not null then coalesce((
        select habit_record.item->>'title'
        from public.profiles profile
        cross join lateral (
          select json_array_elements(coalesce(profile.habits->'recommended', '[]'::json)) as item
          union all
          select json_array_elements(coalesce(profile.habits->'custom', '[]'::json)) as item
        ) habit_record
        where profile.user_id = other.user_id
          and coalesce(habit_record.item->>'id', habit_record.item->>'title') = other.habit_id
        limit 1
      ), other.habit_id, 'Hábito')
      when other.obligation_id is not null then coalesce(other_obligation.title, 'Obligación')
      else coalesce(nullif(btrim(other.notes), ''), 'Recordatorio')
    end,
    case
      when other.task_id is not null then 'Tarea'
      when other.habit_id is not null then 'Hábito'
      when other.obligation_id is not null then 'Obligación'
      else 'Recordatorio'
    end,
    'pending',
    now(),
    null,
    null,
    null
  from public.weekly_planner other
  left join public.obligations other_obligation
    on other_obligation.id = other.obligation_id
   and other_obligation.user_id = other.user_id
  where other.user_id = new.user_id
    and other.id <> new.id
    and (new.date + new.start_time) < (
      other.date + other.end_time
      + case
          when other_obligation.obligation_type = 'sleep'
            and other.end_time < other.start_time
          then interval '1 day'
          else interval '0'
        end
    )
    and (other.date + other.start_time) < obligation_end
  on conflict (source_entry_id, conflicting_entry_id)
  do update set
    status = 'pending',
    detected_at = excluded.detected_at,
    source_title = excluded.source_title,
    source_type = excluded.source_type,
    conflicting_title = excluded.conflicting_title,
    conflicting_type = excluded.conflicting_type,
    grace_until = null,
    resolution_message = null,
    resolved_at = null;

  return new;
end;
$$;

drop trigger if exists weekly_planner_capture_obligation_conflicts on public.weekly_planner;
create trigger weekly_planner_capture_obligation_conflicts
  after insert or update of date, start_time, end_time, obligation_id
  on public.weekly_planner
  for each row execute function public.capture_planner_obligation_conflicts();

create or replace function public.clear_resolved_planner_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;
  if new.obligation_id is not null then
    return new;
  end if;
  if tg_op = 'UPDATE'
    and new.date is not distinct from old.date
    and new.start_time is not distinct from old.start_time
    and new.end_time is not distinct from old.end_time
    and new.task_id is not distinct from old.task_id
    and new.habit_id is not distinct from old.habit_id then
    return new;
  end if;

  update public.planner_conflicts conflict
     set status = 'resolved',
         resolved_at = now(),
         grace_until = null,
         resolution_message = 'La actividad se movió y el solapamiento ya no está activo.'
   where conflict.conflicting_entry_id = new.id
     and conflict.status not in ('resolved', 'dismissed')
     and not exists (
       select 1
       from public.weekly_planner source
       left join public.obligations obligation
         on obligation.id = source.obligation_id
        and obligation.user_id = source.user_id
       where source.id = conflict.source_entry_id
         and (source.date + source.start_time) < (
           new.date + new.end_time
           + case when obligation.obligation_type = 'sleep'
               and new.end_time < new.start_time then interval '1 day' else interval '0' end
         )
         and (new.date + new.start_time) < (
           source.date + source.end_time
           + case when obligation.obligation_type = 'sleep'
               and source.end_time < source.start_time then interval '1 day' else interval '0' end
         )
     );
  return new;
end;
$$;

drop trigger if exists weekly_planner_clear_resolved_conflicts on public.weekly_planner;
create trigger weekly_planner_clear_resolved_conflicts
  after update of date, start_time, end_time, task_id, habit_id, obligation_id
  on public.weekly_planner
  for each row execute function public.clear_resolved_planner_conflicts();

insert into public.planner_conflicts (
  user_id,
  source_entry_id,
  conflicting_entry_id,
  source_title,
  source_type,
  conflicting_title,
  conflicting_type
)
select
  source.user_id,
  source.id,
  other.id,
  coalesce(source_obligation.title, 'Obligación'),
  'Obligación',
  case
    when other.task_id is not null then coalesce((
      select title
      from public.tasks
      where id = other.task_id and user_id = other.user_id
    ), 'Tarea')
    when other.habit_id is not null then coalesce((
      select habit_record.item->>'title'
      from public.profiles profile
      cross join lateral (
        select json_array_elements(coalesce(profile.habits->'recommended', '[]'::json)) as item
        union all
        select json_array_elements(coalesce(profile.habits->'custom', '[]'::json)) as item
      ) habit_record
      where profile.user_id = other.user_id
        and coalesce(habit_record.item->>'id', habit_record.item->>'title') = other.habit_id
      limit 1
    ), other.habit_id, 'Hábito')
    when other.obligation_id is not null then coalesce(other_obligation.title, 'Obligación')
    else coalesce(nullif(btrim(other.notes), ''), 'Recordatorio')
  end,
  case
    when other.task_id is not null then 'Tarea'
    when other.habit_id is not null then 'Hábito'
    when other.obligation_id is not null then 'Obligación'
    else 'Recordatorio'
  end
from public.weekly_planner source
left join public.obligations source_obligation
  on source_obligation.id = source.obligation_id
 and source_obligation.user_id = source.user_id
join public.weekly_planner other
  on other.user_id = source.user_id
 and other.id <> source.id
left join public.obligations other_obligation
  on other_obligation.id = other.obligation_id
 and other_obligation.user_id = other.user_id
where source.obligation_id is not null
  and (source.date + source.start_time) < (
    other.date + other.end_time
    + case when other_obligation.obligation_type = 'sleep'
        and other.end_time < other.start_time then interval '1 day' else interval '0' end
  )
  and (other.date + other.start_time) < (
    source.date + source.end_time
    + case when source_obligation.obligation_type = 'sleep'
        and source.end_time < source.start_time then interval '1 day' else interval '0' end
  )
on conflict (source_entry_id, conflicting_entry_id) do nothing;

create or replace function public.resolve_deleted_planner_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.planner_conflicts
     set status = 'resolved',
         resolved_at = now(),
         grace_until = null,
         resolution_message = 'La actividad se retiró del calendario y el conflicto dejó de estar activo.'
   where conflicting_entry_id = old.id
     and status not in ('resolved', 'backlog', 'unscheduled', 'dismissed');
  return old;
end;
$$;

drop trigger if exists weekly_planner_resolve_deleted_conflicts on public.weekly_planner;
create trigger weekly_planner_resolve_deleted_conflicts
  before delete on public.weekly_planner
  for each row execute function public.resolve_deleted_planner_conflicts();

create or replace function public.process_planner_conflicts_for_user(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  conflict_group record;
  activity record;
  candidate record;
  activity_duration integer;
  activity_start timestamp;
  deadline timestamp;
  search_start timestamp;
  moved_count integer := 0;
  target_date date;
  target_start time;
  target_end time;
  has_slot boolean;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('planner-automation:' || target_user_id::text, 0)) then
    return 0;
  end if;

  update public.planner_conflicts
     set status = 'automatic'
   where user_id = target_user_id
     and status = 'manual'
     and grace_until <= now();

  for conflict_group in
    select distinct source_entry_id
    from public.planner_conflicts
    where user_id = target_user_id
      and status = 'automatic'
  loop
    for activity in
      select distinct entry.id, entry.date, entry.start_time, entry.end_time,
             entry.task_id, entry.habit_id, entry.status
      from public.planner_conflicts conflict
      join public.weekly_planner entry
        on entry.id = conflict.conflicting_entry_id
       and entry.user_id = conflict.user_id
      where conflict.user_id = target_user_id
        and conflict.source_entry_id = conflict_group.source_entry_id
        and conflict.status = 'automatic'
      order by entry.date, entry.start_time, entry.id
    loop
      if activity.task_id is null and activity.habit_id is null then
        update public.planner_conflicts
           set status = 'manual',
               grace_until = null,
               resolution_message = 'Esta actividad no es reorganizable automáticamente. Resuélvela manualmente.'
         where user_id = target_user_id
           and source_entry_id = conflict_group.source_entry_id
           and conflicting_entry_id = activity.id
           and status = 'automatic';
        continue;
      end if;
      if activity.status = 'completed' then
        update public.planner_conflicts
           set status = 'resolved',
               resolved_at = now(),
               grace_until = null,
               resolution_message = 'La actividad se completó antes de reorganizarse.'
         where user_id = target_user_id
           and source_entry_id = conflict_group.source_entry_id
           and conflicting_entry_id = activity.id
           and status = 'automatic';
        continue;
      end if;

      activity_start := activity.date + activity.start_time;
      activity_duration := floor(extract(epoch from (
        activity.date + activity.end_time - activity_start
      )) / 60)::integer;
      if activity_duration <= 0 then
        update public.planner_conflicts
           set status = 'manual',
               grace_until = null,
               resolution_message = 'No se pudo determinar una duración válida; resuélvela manualmente.'
         where user_id = target_user_id
           and source_entry_id = conflict_group.source_entry_id
           and conflicting_entry_id = activity.id
           and status = 'automatic';
        continue;
      end if;

      deadline := activity_start + interval '48 hours';
      search_start := date_trunc('hour', activity_start)
        + (ceil(extract(epoch from (activity_start - date_trunc('hour', activity_start))) / 900) * interval '15 minutes');
      target_date := null;
      has_slot := false;

      for candidate in
        select search_start + (series.step * interval '15 minutes') as starts_at
        from generate_series(0, 192) as series(step)
        where search_start + (series.step * interval '15 minutes') <= deadline
        order by series.step
      loop
        target_date := candidate.starts_at::date;
        target_start := candidate.starts_at::time;
        target_end := (candidate.starts_at + (activity_duration * interval '1 minute'))::time;
        if target_end <= target_start
          or candidate.starts_at::date <> (candidate.starts_at + (activity_duration * interval '1 minute') - interval '1 second')::date then
          continue;
        end if;

        if activity.habit_id is not null and exists (
          select 1
          from public.weekly_planner existing_habit
          where existing_habit.user_id = target_user_id
            and existing_habit.habit_id = activity.habit_id
            and existing_habit.date = target_date
            and existing_habit.id <> activity.id
        ) then
          continue;
        end if;

        if exists (
          select 1
          from public.weekly_planner existing
          left join public.obligations obligation
            on obligation.id = existing.obligation_id
           and obligation.user_id = existing.user_id
          where existing.user_id = target_user_id
            and existing.id <> activity.id
            and candidate.starts_at < (
              existing.date + existing.end_time
              + case when obligation.obligation_type = 'sleep'
                  and existing.end_time < existing.start_time then interval '1 day'
                else interval '0' end
            )
            and (existing.date + existing.start_time) < (
              candidate.starts_at + (activity_duration * interval '1 minute')
            )
        ) then
          continue;
        end if;

        has_slot := true;
        exit;
      end loop;

      if not has_slot then
        target_date := null;
      end if;

      if not has_slot then
        if activity.task_id is not null then
          update public.planner_conflicts
             set status = 'backlog',
                 grace_until = null,
                 resolution_message = 'No se encontró un hueco válido en las próximas 48 horas. La tarea volvió al backlog.'
           where user_id = target_user_id
             and conflicting_entry_id = activity.id
             and status = 'automatic';
          delete from public.weekly_planner
           where id = activity.id and user_id = target_user_id;
        else
          update public.planner_conflicts
             set status = 'unscheduled',
                 grace_until = null,
                 resolution_message = 'No se encontró un hueco válido en las próximas 48 horas. El hábito quedó sin programar.'
           where user_id = target_user_id
             and conflicting_entry_id = activity.id
             and status = 'automatic';
          delete from public.weekly_planner
           where id = activity.id and user_id = target_user_id;
        end if;
      else
        update public.weekly_planner
           set date = target_date,
               start_time = target_start,
               end_time = target_end,
               status = 'moved'
         where id = activity.id
           and user_id = target_user_id;
        update public.planner_conflicts
           set status = 'resolved',
               resolved_at = now(),
               grace_until = null,
               resolution_message = 'Actividad reubicada dentro del límite de 48 horas.'
         where user_id = target_user_id
           and conflicting_entry_id = activity.id
           and status = 'automatic';
        moved_count := moved_count + 1;
      end if;
    end loop;
  end loop;
  return moved_count;
end;
$$;

create or replace function public.resolve_planner_conflict(
  conflict_id uuid,
  resolution_mode text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  conflict_user_id uuid := auth.uid();
  source_id uuid;
  moved_count integer := 0;
begin
  if conflict_user_id is null or resolution_mode not in ('manual', 'automatic') then
    raise exception 'La sesión o el modo de resolución no son válidos.';
  end if;

  select source_entry_id into source_id
  from public.planner_conflicts
  where id = conflict_id
    and user_id = conflict_user_id
    and status in ('pending', 'manual', 'automatic');
  if source_id is null then
    raise exception 'No se encontró el conflicto solicitado.';
  end if;

  update public.planner_conflicts
     set status = resolution_mode,
         detected_at = case when resolution_mode = 'manual' then now() else detected_at end,
         grace_until = case when resolution_mode = 'manual' then now() + interval '30 minutes' else null end,
         resolution_message = null,
         resolved_at = null
   where user_id = conflict_user_id
     and source_entry_id = source_id
     and status in ('pending', 'manual', 'automatic');

  if resolution_mode = 'automatic' then
    moved_count := public.process_planner_conflicts_for_user(conflict_user_id);
  end if;
  return moved_count;
end;
$$;

create or replace function public.dismiss_planner_conflict(conflict_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.planner_conflicts
     set status = 'dismissed'
   where id = conflict_id
     and user_id = auth.uid()
     and status in ('resolved', 'backlog', 'unscheduled');
  if not found then
    raise exception 'Solo se pueden ocultar avisos que ya no requieren resolución.';
  end if;
end;
$$;

revoke all on function public.process_planner_conflicts_for_user(uuid) from public, anon, authenticated;
revoke all on function public.resolve_planner_conflict(uuid, text) from public, anon;
revoke all on function public.dismiss_planner_conflict(uuid) from public, anon;
grant execute on function public.resolve_planner_conflict(uuid, text) to authenticated;
grant execute on function public.dismiss_planner_conflict(uuid) to authenticated;

create or replace function public.process_planner_conflicts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user record;
begin
  for affected_user in
    select distinct user_id
    from public.planner_conflicts
    where status = 'automatic'
       or (status = 'manual' and grace_until <= now())
  loop
    perform public.process_planner_conflicts_for_user(affected_user.user_id);
  end loop;
end;
$$;

revoke all on function public.process_planner_conflicts() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'vektor-process-planner-conflicts') then
    perform cron.schedule(
      'vektor-process-planner-conflicts',
      '* * * * *',
      'select public.process_planner_conflicts();'
    );
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
