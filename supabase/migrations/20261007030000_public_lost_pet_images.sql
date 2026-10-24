create policy "Anyone can view images for active lost reports"
  on storage.objects for select
  using (
    bucket_id = 'pet-images'
    and exists (
      select 1
      from public.pets
      join public.lost_pet_reports
        on lost_pet_reports.pet_id = pets.id
      where lost_pet_reports.status = 'LOST'
        and pets.image_path = storage.objects.name
    )
  );
