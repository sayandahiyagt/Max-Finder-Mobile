alter table public.messages
  add column read_at timestamptz;

alter table public.messages replica identity full;

create or replace function public.mark_conversation_messages_read(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read_at = now()
  where conversation_id = target_conversation_id
    and sender_id <> auth.uid()
    and read_at is null
    and exists (
      select 1
      from public.conversations conversation
      where conversation.id = target_conversation_id
        and auth.uid() in (conversation.finder_id, conversation.owner_id)
    );
end;
$$;

grant execute on function public.mark_conversation_messages_read(uuid) to authenticated;
