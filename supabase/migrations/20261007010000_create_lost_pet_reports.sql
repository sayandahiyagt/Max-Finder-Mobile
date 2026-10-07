create table public.lost_pet_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'LOST' check (status in ('LOST', 'FOUND', 'REMOVED')),
  last_seen_at timestamptz not null,
  last_seen_location text not null check (char_length(last_seen_location) between 1 and 200),
  contact_method text not null check (contact_method in ('email', 'phone')),
  contact_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_lost_report_per_pet
  on public.lost_pet_reports(pet_id)
  where status = 'LOST';

create index lost_pet_reports_status_idx on public.lost_pet_reports(status);
create index lost_pet_reports_owner_idx on public.lost_pet_reports(owner_id);

alter table public.lost_pet_reports enable row level security;

create policy "Anyone can view lost reports"
  on public.lost_pet_reports for select
  using (status = 'LOST' or auth.uid() = owner_id);

create policy "Owners can create lost reports"
  on public.lost_pet_reports for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.pets
      where pets.id = pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Owners can update their reports"
  on public.lost_pet_reports for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
