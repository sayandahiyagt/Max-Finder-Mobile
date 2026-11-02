do $$
begin
  if exists (
    select 1 from public.lost_pet_reports
    where latitude is null or longitude is null or location_label is null
  ) then
    raise exception 'Cannot require report location fields: repair missing legacy coordinates and addresses first';
  end if;
end;
$$;

alter table public.pets rename column id to pet_id;
alter table public.lost_pet_reports drop column last_seen_location;
alter table public.lost_pet_reports rename column id to report_id;
alter table public.lost_pet_reports
  rename column location_label to last_seen_address;
alter table public.lost_pet_reports rename column latitude to last_seen_lat;
alter table public.lost_pet_reports rename column longitude to last_seen_lng;
alter table public.lost_pet_reports
  alter column last_seen_lat set not null,
  alter column last_seen_lng set not null,
  alter column last_seen_address set not null;
alter table public.conversations rename column id to conversation_id;
alter table public.messages rename column id to message_id;

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
      join public.pets pet on pet.pet_id = report.pet_id
      where report.report_id = target_report_id
        and report.status = 'LOST'
        and pet.owner_id in (participant_1_id, participant_2_id)
        and pet.owner_id <> public.current_application_user_id()
    );
$$;

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
      where conversation.conversation_id = target_conversation_id
        and actor_id in (conversation.user_1_id, conversation.user_2_id)
    );
end;
$$;
