create policy "Owners can delete their reports"
  on public.lost_pet_reports for delete
  using (auth.uid() = owner_id);
