create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  species text not null check (species in ('dog', 'cat')),
  breed text not null check (char_length(breed) between 1 and 80),
  color text not null check (char_length(color) between 1 and 80),
  size text not null check (size in ('small', 'medium', 'large')),
  age integer not null check (age between 0 and 200),
  image_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pets_owner_id_idx on public.pets(owner_id);

alter table public.pets enable row level security;

create policy "Users can view their own pets"
  on public.pets for select
  using (auth.uid() = owner_id);

create policy "Users can create their own pets"
  on public.pets for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own pets"
  on public.pets for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own pets"
  on public.pets for delete
  using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', false)
on conflict (id) do nothing;

create policy "Users can manage their own pet images"
  on storage.objects for all
  using (
    bucket_id = 'pet-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'pet-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
