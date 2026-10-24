create or replace function public.get_conversation_participant_name(
  target_conversation_id uuid,
  target_user_id uuid
)
returns text
language sql
security definer
stable
set search_path = public, auth
as $$
  select coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), 'Max Finder user')
  from public.conversations conversation
  join auth.users u on u.id = target_user_id
  where conversation.id = target_conversation_id
    and auth.uid() in (conversation.finder_id, conversation.owner_id)
    and target_user_id in (conversation.finder_id, conversation.owner_id)
    and target_user_id <> auth.uid()
  limit 1;
$$;

grant execute on function public.get_conversation_participant_name(uuid, uuid) to authenticated;
