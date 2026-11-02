drop policy if exists "Anyone can view lost reports" on public.lost_pet_reports;
drop policy if exists "Lost reports are publicly readable" on public.lost_pet_reports;
drop policy if exists "Users can create their own lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can create lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can update their reports" on public.lost_pet_reports;
drop policy if exists "Owners can update their lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can delete their reports" on public.lost_pet_reports;
drop policy if exists "Owners can delete their lost reports" on public.lost_pet_reports;

create policy "Authenticated users can read lost reports"
  on public.lost_pet_reports for select to authenticated
  using (status = 'LOST' or auth.uid() = owner_id);

create policy "Owners can create reports for owned pets"
  on public.lost_pet_reports for insert to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.pets
      where pets.id = pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Owners can update their reports"
  on public.lost_pet_reports for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Anyone can view pets in active lost reports" on public.pets;
drop policy if exists "Users can view their own pets" on public.pets;
create policy "Owners can read their private pets"
  on public.pets for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Participants can view conversations" on public.conversations;
drop policy if exists "Participants can read conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Participants can update conversations" on public.conversations;
drop policy if exists "Finders can start conversations for active reports" on public.conversations;

create policy "Participants can read conversations"
  on public.conversations for select to authenticated
  using (auth.uid() in (finder_id, owner_id));

create policy "Finders can start conversations for active reports"
  on public.conversations for insert to authenticated
  with check (
    finder_id = auth.uid()
    and finder_id <> owner_id
    and exists (
      select 1 from public.lost_pet_reports report
      where report.id = report_id
        and report.owner_id = conversations.owner_id
        and report.status = 'LOST'
    )
  );

drop policy if exists "Participants can view messages" on public.messages;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Participants can send messages for active reports" on public.messages;

create policy "Participants can read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations conversation
      where conversation.id = conversation_id
        and auth.uid() in (conversation.finder_id, conversation.owner_id)
    )
  );

create policy "Participants can send messages for active reports"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.conversations conversation
      join public.lost_pet_reports report on report.id = conversation.report_id
      where conversation.id = conversation_id
        and auth.uid() in (conversation.finder_id, conversation.owner_id)
        and report.status = 'LOST'
    )
  );

revoke all on table public.lost_pet_reports, public.pets,
  public.conversations, public.messages from anon;
grant select, insert, update on table public.lost_pet_reports to authenticated;
grant select, insert, update, delete on table public.pets to authenticated;
grant select, insert on table public.conversations, public.messages to authenticated;
