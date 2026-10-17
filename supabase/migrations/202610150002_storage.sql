insert into storage.buckets (id, name, public)
values
  ('lost-pet-images', 'lost-pet-images', true),
  ('spotting-images', 'spotting-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view lost pet images" on storage.objects;
drop policy if exists "Public can view spotting images" on storage.objects;

create policy "Public can view lost pet images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'lost-pet-images');

create policy "Public can view spotting images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'spotting-images');
