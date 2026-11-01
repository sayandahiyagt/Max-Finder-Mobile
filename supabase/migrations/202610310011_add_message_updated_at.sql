alter table public.messages
  add column updated_at timestamptz not null default now();
