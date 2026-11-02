do $$
begin
  if exists (
    select 1 from public.pets pet
    where not exists (
      select 1 from public.users app_user
      where app_user.auth_provider_id = pet.owner_id
    )
  ) or exists (
    select 1 from public.lost_pet_reports report
    where not exists (
      select 1 from public.users app_user
      where app_user.auth_provider_id = report.owner_id
    )
  ) or exists (
    select 1 from public.conversations conversation
    where not exists (
      select 1 from public.users app_user
      where app_user.auth_provider_id = conversation.owner_id
    ) or not exists (
      select 1 from public.users app_user
      where app_user.auth_provider_id = conversation.finder_id
    )
  ) or exists (
    select 1 from public.messages message
    where not exists (
      select 1 from public.users app_user
      where app_user.auth_provider_id = message.sender_id
    )
  ) then
    raise exception 'Cannot map application ownership: an Auth identity has no application user';
  end if;
end;
$$;

create or replace function public.current_application_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id
  from public.users
  where auth_provider_id = auth.uid()
$$;

revoke all on function public.current_application_user_id() from public, anon;
grant execute on function public.current_application_user_id() to authenticated;

alter table public.pets drop constraint if exists pets_owner_id_fkey;
alter table public.lost_pet_reports drop constraint if exists lost_pet_reports_owner_id_fkey;
alter table public.conversations
  drop constraint if exists conversations_owner_id_fkey,
  drop constraint if exists conversations_finder_id_fkey;
alter table public.messages drop constraint if exists messages_sender_id_fkey;

update public.pets pet
set owner_id = app_user.user_id
from public.users app_user
where pet.owner_id = app_user.auth_provider_id;

update public.lost_pet_reports report
set owner_id = app_user.user_id
from public.users app_user
where report.owner_id = app_user.auth_provider_id;

update public.conversations conversation
set owner_id = app_user.user_id
from public.users app_user
where conversation.owner_id = app_user.auth_provider_id;

update public.conversations conversation
set finder_id = app_user.user_id
from public.users app_user
where conversation.finder_id = app_user.auth_provider_id;

update public.messages message
set sender_id = app_user.user_id
from public.users app_user
where message.sender_id = app_user.auth_provider_id;

alter table public.pets
  add constraint pets_owner_id_fkey
  foreign key (owner_id) references public.users(user_id) on delete cascade;
alter table public.lost_pet_reports
  add constraint lost_pet_reports_owner_id_fkey
  foreign key (owner_id) references public.users(user_id) on delete cascade;
alter table public.conversations
  add constraint conversations_owner_id_fkey
    foreign key (owner_id) references public.users(user_id) on delete cascade,
  add constraint conversations_finder_id_fkey
    foreign key (finder_id) references public.users(user_id) on delete cascade;
alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.users(user_id) on delete cascade;

drop policy if exists "Users can view their own pets" on public.pets;
drop policy if exists "Users can create their own pets" on public.pets;
drop policy if exists "Users can update their own pets" on public.pets;
drop policy if exists "Users can delete their own pets" on public.pets;
drop policy if exists "Owners can read their private pets" on public.pets;
create policy "Owners can read their private pets"
  on public.pets for select to authenticated
  using (owner_id = public.current_application_user_id());
create policy "Owners can create their own pets"
  on public.pets for insert to authenticated
  with check (owner_id = public.current_application_user_id());
create policy "Owners can update their own pets"
  on public.pets for update to authenticated
  using (owner_id = public.current_application_user_id())
  with check (owner_id = public.current_application_user_id());
create policy "Owners can delete their own pets"
  on public.pets for delete to authenticated
  using (owner_id = public.current_application_user_id());

drop policy if exists "Anyone can view lost reports" on public.lost_pet_reports;
drop policy if exists "Lost reports are publicly readable" on public.lost_pet_reports;
drop policy if exists "Authenticated users can read lost reports" on public.lost_pet_reports;
drop policy if exists "Users can create their own lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can create lost reports" on public.lost_pet_reports;
drop policy if exists "Owners can create reports for owned pets" on public.lost_pet_reports;
drop policy if exists "Owners can update their reports" on public.lost_pet_reports;
drop policy if exists "Owners can update their lost reports" on public.lost_pet_reports;
create policy "Authenticated users can read lost reports"
  on public.lost_pet_reports for select to authenticated
  using (status = 'LOST' or owner_id = public.current_application_user_id());
create policy "Owners can create reports for owned pets"
  on public.lost_pet_reports for insert to authenticated
  with check (
    owner_id = public.current_application_user_id()
    and exists (
      select 1 from public.pets
      where pets.id = pet_id
        and pets.owner_id = public.current_application_user_id()
    )
  );
create policy "Owners can update their reports"
  on public.lost_pet_reports for update to authenticated
  using (owner_id = public.current_application_user_id())
  with check (owner_id = public.current_application_user_id());

drop policy if exists "Participants can view conversations" on public.conversations;
drop policy if exists "Participants can read conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Participants can update conversations" on public.conversations;
drop policy if exists "Finders can start conversations for active reports" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations for select to authenticated
  using (
    public.current_application_user_id() in (finder_id, owner_id)
  );
create policy "Finders can start conversations for active reports"
  on public.conversations for insert to authenticated
  with check (
    finder_id = public.current_application_user_id()
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
        and public.current_application_user_id() in (
          conversation.finder_id, conversation.owner_id
        )
    )
  );
create policy "Participants can send messages for active reports"
  on public.messages for insert to authenticated
  with check (
    sender_id = public.current_application_user_id()
    and exists (
      select 1
      from public.conversations conversation
      join public.lost_pet_reports report on report.id = conversation.report_id
      where conversation.id = conversation_id
        and public.current_application_user_id() in (
          conversation.finder_id, conversation.owner_id
        )
        and report.status = 'LOST'
    )
  );

drop policy if exists "Owners can manage private pet images" on public.pet_images;
create policy "Owners can manage private pet images"
  on public.pet_images for all to authenticated
  using (
    exists (
      select 1 from public.pets
      where pets.id = pet_id
        and pets.owner_id = public.current_application_user_id()
    )
  )
  with check (
    exists (
      select 1 from public.pets
      where pets.id = pet_id
        and pets.owner_id = public.current_application_user_id()
    )
  );
