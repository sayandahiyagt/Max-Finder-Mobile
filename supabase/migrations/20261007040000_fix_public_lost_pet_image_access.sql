create or replace function public.can_view_lost_pet_image(object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets
    join public.lost_pet_reports
      on lost_pet_reports.pet_id = pets.id
    where lost_pet_reports.status = 'LOST'
      and pets.image_path = object_name
  );
$$;

revoke all on function public.can_view_lost_pet_image(text) from public;
grant execute on function public.can_view_lost_pet_image(text) to anon, authenticated;

drop policy if exists "Anyone can view images for active lost reports"
  on storage.objects;

create policy "Anyone can view images for active lost reports"
  on storage.objects for select
  using (
    bucket_id = 'pet-images'
    and public.can_view_lost_pet_image(name)
  );
