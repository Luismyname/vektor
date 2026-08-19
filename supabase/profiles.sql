create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null,
  middle_name text,
  last_name text not null,
  birth_date date not null,
  address text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles drop column if exists nickname;

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, first_name, middle_name, last_name,
    birth_date, address
  ) values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'middle_name',
    new.raw_user_meta_data ->> 'last_name',
    (new.raw_user_meta_data ->> 'birth_date')::date,
    new.raw_user_meta_data ->> 'address'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
