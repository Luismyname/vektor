begin;

create temporary table weekly_review_migration_source (
  user_id uuid not null,
  review_date date not null,
  answers jsonb not null
) on commit drop;

do $$
declare
  legacy_row record;
  review_answers jsonb;
begin
  for legacy_row in
    select user_id, date, notes
    from public.weekly_planner
    where task_id is null
      and habit_id is null
      and left(btrim(notes), 1) = '{'
  loop
    begin
      review_answers := legacy_row.notes::jsonb;
    exception when invalid_text_representation then
      continue;
    end;

    if jsonb_typeof(review_answers) = 'object'
      and review_answers ?| array['learned', 'built', 'improved', 'failedHabit', 'keptHabit'] then
      insert into weekly_review_migration_source (user_id, review_date, answers)
      values (legacy_row.user_id, legacy_row.date, review_answers);
    end if;
  end loop;
end $$;

insert into public.weekly_reviews (user_id, review_date, answers)
select source.user_id, source.review_date, source.answers
from weekly_review_migration_source as source
where not exists (
  select 1
  from public.weekly_reviews as target
  where target.user_id = source.user_id
    and target.review_date = source.review_date
);

do $$
begin
  if exists (
    select 1
    from weekly_review_migration_source as source
    left join public.weekly_reviews as target
      on target.user_id = source.user_id
      and target.review_date = source.review_date
    where target.id is null
      or target.answers is distinct from source.answers
  ) then
    raise exception 'Weekly review migration verification failed; transaction rolled back.';
  end if;
end $$;

select
  (select count(*) from weekly_review_migration_source) as legacy_reviews,
  (
    select count(*)
    from weekly_review_migration_source as source
    join public.weekly_reviews as target
      on target.user_id = source.user_id
      and target.review_date = source.review_date
    where target.answers = source.answers
  ) as verified_reviews;

commit;
