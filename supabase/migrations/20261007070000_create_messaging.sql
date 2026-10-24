create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lost_pet_reports(id) on delete cascade,
  finder_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, finder_id),
  check (finder_id <> owner_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index conversations_finder_id_idx on public.conversations(finder_id);
create index conversations_owner_id_idx on public.conversations(owner_id);
create index messages_conversation_created_at_idx
  on public.messages(conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Participants can view conversations"
  on public.conversations for select
  using (auth.uid() in (finder_id, owner_id));

create policy "Finders can start conversations for active reports"
  on public.conversations for insert
  with check (
    finder_id = auth.uid()
    and finder_id <> owner_id
    and exists (
      select 1
      from public.lost_pet_reports report
      where report.id = report_id
        and report.owner_id = conversations.owner_id
        and report.status = 'LOST'
    )
  );

create policy "Participants can update conversations"
  on public.conversations for update
  using (auth.uid() in (finder_id, owner_id))
  with check (auth.uid() in (finder_id, owner_id));

create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations conversation
      where conversation.id = conversation_id
        and auth.uid() in (conversation.finder_id, conversation.owner_id)
    )
  );

create policy "Participants can send messages for active reports"
  on public.messages for insert
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

alter publication supabase_realtime add table public.messages;
