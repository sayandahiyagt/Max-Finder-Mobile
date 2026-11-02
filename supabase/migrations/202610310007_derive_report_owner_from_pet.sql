do $$
begin
  if exists (
    select 1
    from public.lost_pet_reports report
    join public.pets pet on pet.id = report.pet_id
    where report.owner_id <> pet.owner_id
  ) then
    raise exception 'Cannot remove report owner_id: report and Pet Profile owners differ';
  end if;
end;
$$;

drop policy if exists "Anyone can view lost reports" on public.lost_pet_reports;
drop policy if exists "Lost reports are publicly readable" on public.lost_pet_reports;
drop policy if exists "Authenticated users can read lost reports" on public.lost_pet_reports;
drop policy if exists "Users can create their own lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can create lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can create reports for owned pets" on public.lost_pet_reports;
drop policy if exists "Owners can update their reports" on public.lost_pet_reports;
drop policy if exists "Owners can update their lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can delete their reports" on public.lost_pet_reports;
drop policy if exists "Owners can delete their lost reports" on public.lost_pet_reports;
drop policy if exists "Finders can start conversations for active reports" on public.conversations;

alter table public.lost_pet_reports
  drop constraint if exists lost_pet_reports_owner_id_fkey,
  drop column owner_id;
drop index if exists public.lost_pet_reports_owner_idx;

create policy "Authenticated users can read lost reports"
  on public.lost_pet_reports for select to authenticated
  using (
    status = 'LOST'
    or exists (
      select 1 from public.pets pet
      where pet.id = pet_id
        and pet.owner_id = public.current_application_user_id()
    )
  );

create policy "Owners can create reports for owned pets"
  on public.lost_pet_reports for insert to authenticated
  with check (
    exists (
      select 1 from public.pets pet
      where pet.id = pet_id
        and pet.owner_id = public.current_application_user_id()
    )
  );

create policy "Owners can update their reports"
  on public.lost_pet_reports for update to authenticated
  using (
    exists (
      select 1 from public.pets pet
      where pet.id = pet_id
        and pet.owner_id = public.current_application_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.pets pet
      where pet.id = pet_id
        and pet.owner_id = public.current_application_user_id()
    )
  );

create policy "Finders can start conversations for active reports"
  on public.conversations for insert to authenticated
  with check (
    finder_id = public.current_application_user_id()
    and finder_id <> owner_id
    and exists (
      select 1
      from public.lost_pet_reports report
      join public.pets pet on pet.id = report.pet_id
      where report.id = report_id
        and pet.owner_id = conversations.owner_id
        and report.status = 'LOST'
    )
  );

revoke delete on public.lost_pet_reports from authenticated;
grant select, insert, update on public.lost_pet_reports to authenticated;
