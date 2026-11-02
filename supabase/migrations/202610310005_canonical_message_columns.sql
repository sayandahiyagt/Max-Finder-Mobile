do $$
begin
  if exists (
    select 1
    from public.conversations
    where (lost_pet_report_id is not null and lost_pet_report_id <> report_id)
      or (participant_id is not null and participant_id <> finder_id)
  ) then
    raise exception 'Conversation legacy columns contain values that disagree with canonical columns';
  end if;
end;
$$;

update public.messages
set content = coalesce(nullif(trim(content), ''), body);

alter table public.messages
  alter column content set not null,
  add constraint messages_content_check
    check (char_length(trim(content)) between 1 and 2000);

drop index if exists public.conversations_participants_idx;

alter table public.conversations
  drop column lost_pet_report_id,
  drop column participant_id;

alter table public.messages
  drop column body;
