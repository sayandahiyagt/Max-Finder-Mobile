create table public.users (
  user_id uuid primary key default gen_random_uuid(),
  auth_provider_id uuid not null unique references auth.users (id) on delete cascade,
  email varchar(255) not null unique,
  display_name varchar(100) not null,
  role varchar(20) not null default 'USER' check (role in ('USER', 'ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.users (auth_provider_id, email, display_name)
select
  auth_user.id,
  auth_user.email,
  coalesce(
    nullif(left(trim(profile.display_name), 100), ''),
    nullif(left(trim(auth_user.raw_user_meta_data ->> 'display_name'), 100), ''),
    nullif(left(split_part(auth_user.email, '@', 1), 100), ''),
    'MaxFinder member'
  )
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
where auth_user.email is not null;

create or replace function public.create_application_user_for_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.users (auth_provider_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 100), ''),
      nullif(left(split_part(new.email, '@', 1), 100), ''),
      'MaxFinder member'
    )
  )
  on conflict (auth_provider_id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_application_user on auth.users;
create trigger on_auth_user_created_application_user
  after insert on auth.users
  for each row execute function public.create_application_user_for_auth_identity();

alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated, service_role;
