do $$
begin
  if exists (
    select 1 from public.conversations
    where owner_id = finder_id
  ) then
    raise exception 'Cannot canonicalize conversation participants: participant IDs must differ';
  end if;
end;
$$;

drop policy if exists "Participants can view conversations" on public.conversations;
drop policy if exists "Participants can read conversations" on public.conversations;
drop policy if exists "Participants can create conversations" on public.conversations;
drop policy if exists "Participants can update conversations" on public.conversations;
drop policy if exists "Finders can start conversations for active reports" on public.conversations;
drop policy if exists "Participants can view messages" on public.messages;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Participants can send messages for active reports" on public.messages;

alter table public.conversations
  add column user_1_id uuid,
  add column user_2_id uuid;

update public.conversations
set user_1_id = least(finder_id, owner_id),
    user_2_id = greatest(finder_id, owner_id);

alter table public.conversations
  alter column user_1_id set not null,
  alter column user_2_id set not null,
  drop constraint if exists conversations_report_id_finder_id_key,
  drop constraint if exists conversations_finder_id_owner_id_check,
  drop constraint if exists conversations_check,
  drop constraint if exists conversations_check,
  drop constraint if exists conversations_owner_id_fkey,
  drop constraint if exists conversations_finder_id_fkey,
  drop column owner_id,
  drop column finder_id,
  add constraint conversations_user_1_id_fkey
    foreign key (user_1_id) references public.users(user_id) on delete cascade,
  add constraint conversations_user_2_id_fkey
    foreign key (user_2_id) references public.users(user_id) on delete cascade,
  add constraint conversations_participants_canonical_check
    check (user_1_id < user_2_id),
  add constraint conversations_report_participants_key
    unique (report_id, user_1_id, user_2_id);

drop index if exists public.conversations_finder_id_idx;
drop index if exists public.conversations_owner_id_idx;
create index conversations_user_1_id_idx on public.conversations(user_1_id);
create index conversations_user_2_id_idx on public.conversations(user_2_id);

create or replace function public.can_start_report_conversation(
  target_report_id uuid,
  participant_1_id uuid,
  participant_2_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_application_user_id() in (
      participant_1_id, participant_2_id
    )
    and exists (
      select 1
      from public.lost_pet_reports report
      join public.pets pet on pet.id = report.pet_id
      where report.id = target_report_id
        and report.status = 'LOST'
        and pet.owner_id in (participant_1_id, participant_2_id)
        and pet.owner_id <> public.current_application_user_id()
    );
$$;
revoke all on function public.can_start_report_conversation(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_start_report_conversation(uuid, uuid, uuid)
  to authenticated;

create policy "Participants can read conversations"
  on public.conversations for select to authenticated
  using (
    public.current_application_user_id() in (user_1_id, user_2_id)
  );

create policy "Finders can start conversations for active reports"
  on public.conversations for insert to authenticated
  with check (
    public.can_start_report_conversation(
      report_id, user_1_id, user_2_id
    )
  );

create policy "Participants can read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations conversation
      where conversation.id = conversation_id
        and public.current_application_user_id() in (
          conversation.user_1_id, conversation.user_2_id
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
          conversation.user_1_id, conversation.user_2_id
        )
        and report.status = 'LOST'
    )
  );

create or replace function public.mark_conversation_messages_read(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := public.current_application_user_id();
begin
  update public.messages
  set read_at = now()
  where conversation_id = target_conversation_id
    and sender_id <> actor_id
    and read_at is null
    and exists (
      select 1 from public.conversations conversation
      where conversation.id = target_conversation_id
        and actor_id in (conversation.user_1_id, conversation.user_2_id)
    );
end;
$$;
revoke all on function public.mark_conversation_messages_read(uuid)
  from public, anon;
grant execute on function public.mark_conversation_messages_read(uuid)
  to authenticated;
