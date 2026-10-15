create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'MaxFinder member',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lost_pet_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_name text not null check (char_length(pet_name) between 1 and 100),
  species text not null check (species in ('Dog', 'Cat')),
  breed text not null check (char_length(breed) between 1 and 100),
  weight_range text not null check (weight_range in ('Under 10 lbs', '10–25 lbs', '26–50 lbs', '51–75 lbs', 'Over 75 lbs', 'Unknown')),
  description text not null check (char_length(description) between 1 and 2000),
  last_seen_at timestamptz not null,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  location_label text not null check (char_length(location_label) between 1 and 255),
  image_path text not null,
  status text not null default 'LOST' check (status in ('LOST', 'FOUND')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.spottings (
  id uuid primary key default gen_random_uuid(),
  species text check (species is null or species in ('Dog', 'Cat')),
  breed text check (breed is null or char_length(breed) <= 100),
  weight_range text check (weight_range is null or weight_range in ('Under 10 lbs', '10–25 lbs', '26–50 lbs', '51–75 lbs', 'Over 75 lbs', 'Unknown')),
  description text check (description is null or char_length(description) <= 2000),
  distinguishing_characteristics text check (distinguishing_characteristics is null or char_length(distinguishing_characteristics) <= 2000),
  spotted_at timestamptz not null,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  location_label text not null check (char_length(location_label) between 1 and 255),
  image_path text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  lost_pet_report_id uuid not null references public.lost_pet_reports(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (owner_id <> participant_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.lost_pet_reports
  add column if not exists pet_name text,
  add column if not exists species text,
  add column if not exists breed text,
  add column if not exists weight_range text,
  add column if not exists description text,
  add column if not exists location_label text,
  add column if not exists image_path text;

alter table public.conversations
  add column if not exists lost_pet_report_id uuid references public.lost_pet_reports(id) on delete cascade,
  add column if not exists participant_id uuid references public.profiles(id) on delete cascade;

alter table public.messages
  add column if not exists content text;

create index if not exists lost_pet_reports_map_idx
  on public.lost_pet_reports (status, latitude, longitude);
create index if not exists spottings_map_idx
  on public.spottings (latitude, longitude);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);
create unique index if not exists conversations_participants_idx
  on public.conversations (
    lost_pet_report_id,
    least(owner_id, participant_id),
    greatest(owner_id, participant_id)
  );

alter table public.profiles enable row level security;
alter table public.lost_pet_reports enable row level security;
alter table public.spottings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are visible by display name" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Lost reports are publicly readable" on public.lost_pet_reports;
drop policy if exists "Users can create their own lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can update their lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can delete their lost reports" on public.lost_pet_reports;
drop policy if exists "Spottings are publicly readable" on public.spottings;
drop policy if exists "Participants can read conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;

create policy "Profiles are visible by display name"
  on public.profiles for select to authenticated using (true);
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Lost reports are publicly readable"
  on public.lost_pet_reports for select to anon, authenticated using (true);
create policy "Users can create their own lost reports"
  on public.lost_pet_reports for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owners can update their lost reports"
  on public.lost_pet_reports for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners can delete their lost reports"
  on public.lost_pet_reports for delete to authenticated using (auth.uid() = owner_id);

create policy "Spottings are publicly readable"
  on public.spottings for select to anon, authenticated using (true);

create policy "Participants can read conversations"
  on public.conversations for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = participant_id);
create policy "Participants can create conversations"
  on public.conversations for insert to authenticated
  with check (auth.uid() = owner_id or auth.uid() = participant_id);
create policy "Participants can read messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
  ));
create policy "Participants can send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.participant_id = auth.uid())
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'MaxFinder member'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
