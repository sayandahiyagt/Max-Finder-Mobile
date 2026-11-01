alter table public.pets
  add column if not exists description text,
  add column if not exists date_of_birth date,
  alter column breed drop not null,
  alter column image_path drop not null;

alter table public.pets
  drop constraint if exists pets_name_check,
  drop constraint if exists pets_breed_check;

alter table public.pets
  add constraint pets_name_check check (char_length(name) between 1 and 100),
  add constraint pets_breed_check check (breed is null or char_length(breed) <= 100);

insert into storage.buckets (id, name, public)
values
  ('pet-images', 'pet-images', false),
  ('lost-pet-images', 'lost-pet-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Public can view lost pet images" on storage.objects;
drop policy if exists "Anyone can view images for active lost reports" on storage.objects;
drop policy if exists "Users can manage their own pet images" on storage.objects;
revoke all on function public.can_view_lost_pet_image(text) from anon, authenticated;

create table public.pet_images (
  image_id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.pets(id) on delete cascade,
  storage_path text not null unique,
  caption varchar(255),
  created_at timestamptz not null default now()
);

insert into public.pet_images (pet_id, storage_path)
select id, image_path
from public.pets
where image_path is not null
on conflict (pet_id) do nothing;

create or replace function public.can_view_lost_pet_image(object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pet_images image
    join public.lost_pet_reports report on report.pet_id = image.pet_id
    where report.status = 'LOST' and image.storage_path = object_name
  );
$$;

alter table public.pet_images enable row level security;
create policy "Owners can manage private pet images"
  on public.pet_images for all to authenticated
  using (
    exists (
      select 1 from public.pets
      where pets.id = pet_id and pets.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pets
      where pets.id = pet_id and pets.owner_id = auth.uid()
    )
  );

revoke all on table public.pet_images from anon;
grant select, insert, update, delete on table public.pet_images to authenticated;

alter table public.lost_pet_reports
  drop constraint if exists lost_pet_reports_pet_id_fkey,
  add constraint lost_pet_reports_pet_id_fkey
    foreign key (pet_id) references public.pets(id) on delete restrict;
