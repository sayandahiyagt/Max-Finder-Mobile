create policy "Anyone can view pets in active lost reports"
  on public.pets for select
  using (
    exists (
      select 1
      from public.lost_pet_reports
      where lost_pet_reports.pet_id = pets.id
        and lost_pet_reports.status = 'LOST'
    )
  );
