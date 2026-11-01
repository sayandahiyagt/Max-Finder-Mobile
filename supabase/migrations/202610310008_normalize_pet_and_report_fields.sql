do $$
begin
  if exists (
    select 1
    from public.pets pet
    where pet.image_path is not null
      and not exists (
        select 1 from public.pet_images image
        where image.pet_id = pet.id
          and image.storage_path = pet.image_path
      )
  ) then
    raise exception 'Cannot remove pets.image_path: a profile image is missing from pet_images';
  end if;
end;
$$;

alter table public.lost_pet_reports
  drop column pet_name,
  drop column species,
  drop column breed,
  drop column image_path;

alter table public.pets
  drop column image_path;
