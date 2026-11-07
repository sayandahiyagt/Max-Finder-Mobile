-- Synthetic records for local development and tests. Never use this seed in a hosted project.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'owner@example.test', crypt('local-only-test-password', gen_salt('bf')), now(), '', '', '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Riley Owner"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'sam.finder@example.test', crypt('local-only-test-password', gen_salt('bf')), now(), '', '', '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Sam Finder"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'admin@example.test', crypt('local-only-test-password', gen_salt('bf')), now(), '', '', '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Taylor Admin"}', now(), now())
on conflict (id) do update set
  email = excluded.email,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (id, display_name)
values
  ('00000000-0000-4000-8000-000000000101', 'Riley Owner'),
  ('00000000-0000-4000-8000-000000000102', 'Sam Finder'),
  ('00000000-0000-4000-8000-000000000103', 'Taylor Admin')
on conflict (id) do update set display_name = excluded.display_name;

update public.users
set role = 'ADMIN', updated_at = now()
where auth_provider_id = '00000000-0000-4000-8000-000000000103';

update public.users as app_user
set user_id = seed.user_id
from (
  values
    ('00000000-0000-4000-8000-000000000101'::uuid, '00000000-0000-4000-8000-000000000001'::uuid),
    ('00000000-0000-4000-8000-000000000102'::uuid, '00000000-0000-4000-8000-000000000002'::uuid),
    ('00000000-0000-4000-8000-000000000103'::uuid, '00000000-0000-4000-8000-000000000003'::uuid)
) as seed(auth_provider_id, user_id)
where app_user.auth_provider_id = seed.auth_provider_id;

insert into public.pets (
  pet_id, owner_id, name, species, breed, color, size, age
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000001',
    'Mochi', 'cat', 'Domestic Shorthair', 'Gray tabby', 'small', 5
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000001',
    'Biscuit', 'dog', 'Beagle', 'Tan and white', 'medium', 3
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000001',
    'Pepper', 'cat', 'Domestic Shorthair', 'Black', 'small', 7
  ),
  (
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000001',
    'Juniper', 'dog', 'Beagle', 'Tan and white', 'medium', 4
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    '00000000-0000-4000-8000-000000000001',
    'Pip', 'cat', 'Domestic Shorthair', 'Orange tabby', 'small', 2
  ),
  (
    '00000000-0000-4000-8000-000000000206',
    '00000000-0000-4000-8000-000000000001',
    'Scout', 'dog', 'Labrador Retriever', 'Black', 'large', 6
  ),
  (
    '00000000-0000-4000-8000-000000000207',
    '00000000-0000-4000-8000-000000000001',
    'Clover', 'cat', 'Domestic Shorthair', 'Gray and white', 'small', 3
  )
on conflict (pet_id) do update set
  name = excluded.name,
  species = excluded.species,
  breed = excluded.breed,
  color = excluded.color,
  size = excluded.size,
  age = excluded.age,
  updated_at = now();

insert into public.pet_images (pet_id, storage_path)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101/pets/mochi.png'
)
on conflict (pet_id) do update set storage_path = excluded.storage_path;

insert into public.lost_pet_reports (
  report_id, pet_id, status, last_seen_at, last_seen_lat, last_seen_lng,
  last_seen_address, contact_method, contact_value, weight_range, description
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000201', 'LOST',
    '2026-10-20T18:30:00Z', 40.7128, -74.006,
    'Example Park, Example City', 'email', 'owner@example.test',
    'Under 10 lbs', 'Gray tabby with a white chest.'
  ),
  (
    '00000000-0000-4000-8000-000000000311',
    '00000000-0000-4000-8000-000000000202', 'FOUND',
    '2026-10-21T18:30:00Z', 40.7134, -74.0048,
    'Example Park, Example City', 'in_app', null,
    '10–25 lbs', 'Biscuit was safely found near the park.'
  ),
  (
    '00000000-0000-4000-8000-000000000312',
    '00000000-0000-4000-8000-000000000203', 'REMOVED',
    '2026-10-19T18:30:00Z', 40.7119, -74.0071,
    'Example Park, Example City', 'in_app', null,
    'Under 10 lbs', 'Synthetic report retained in the removed state.'
  ),
  (
    '00000000-0000-4000-8000-000000000313',
    '00000000-0000-4000-8000-000000000204', 'LOST',
    '2026-11-01T14:15:00Z', 40.7140, -74.0045,
    'Near City Hall Park', 'in_app', null,
    '10–25 lbs', 'Small tan dog wearing a blue collar.'
  ),
  (
    '00000000-0000-4000-8000-000000000314',
    '00000000-0000-4000-8000-000000000205', 'LOST',
    '2026-11-02T09:30:00Z', 40.7112, -74.0080,
    'Near the WTC Memorial', 'in_app', null,
    'Under 10 lbs', 'Orange cat with a white chest.'
  ),
  (
    '00000000-0000-4000-8000-000000000315',
    '00000000-0000-4000-8000-000000000206', 'LOST',
    '2026-11-03T17:45:00Z', 40.7154, -74.0105,
    'Near Tribeca Park', 'in_app', null,
    '51–75 lbs', 'Friendly black dog with a red harness.'
  ),
  (
    '00000000-0000-4000-8000-000000000316',
    '00000000-0000-4000-8000-000000000207', 'LOST',
    '2026-11-04T12:00:00Z', 40.7106, -74.0025,
    'Near South Street', 'in_app', null,
    'Under 10 lbs', 'Gray and white cat with a green tag.'
  )
on conflict (report_id) do update set
  pet_id = excluded.pet_id,
  status = excluded.status,
  last_seen_at = excluded.last_seen_at,
  last_seen_lat = excluded.last_seen_lat,
  last_seen_lng = excluded.last_seen_lng,
  last_seen_address = excluded.last_seen_address,
  contact_method = excluded.contact_method,
  contact_value = excluded.contact_value,
  weight_range = excluded.weight_range,
  description = excluded.description;

insert into public.spottings (
  id, species, breed, weight_range, description,
  distinguishing_characteristics, spotted_at, latitude, longitude,
  location_label, image_path
)
values
  (
  '00000000-0000-4000-8000-000000000302', 'Cat', 'Domestic Shorthair',
  'Under 10 lbs', 'Gray tabby near the park.', 'White chest',
  '2026-10-21T19:00:00Z', 40.7132, -74.0056,
  'Example Park, Example City', 'dummy/spotting.png'
  ),
  (
    '00000000-0000-4000-8000-000000000303', 'Dog', 'Beagle',
    '10–25 lbs', 'Tan dog near City Hall Park.', 'Blue collar',
    '2026-11-01T15:00:00Z', 40.7145, -74.0052,
    'City Hall Park', 'dummy/spotting.png'
  ),
  (
    '00000000-0000-4000-8000-000000000304', 'Cat', 'Domestic Shorthair',
    'Under 10 lbs', 'Orange cat near the memorial.', 'White chest',
    '2026-11-02T10:00:00Z', 40.7121, -74.0038,
    'WTC Memorial area', 'dummy/spotting.png'
  ),
  (
    '00000000-0000-4000-8000-000000000305', 'Dog', 'Labrador Retriever',
    '51–75 lbs', 'Black dog near Tribeca Park.', 'Red harness',
    '2026-11-03T18:00:00Z', 40.7160, -74.0082,
    'Tribeca Park', 'dummy/spotting.png'
  ),
  (
    '00000000-0000-4000-8000-000000000306', 'Cat', 'Domestic Shorthair',
    'Under 10 lbs', 'Gray and white cat near South Street.', 'Green tag',
    '2026-11-04T12:30:00Z', 40.7108, -74.0061,
    'South Street area', 'dummy/spotting.png'
  )
on conflict (id) do update set
  species = excluded.species,
  breed = excluded.breed,
  weight_range = excluded.weight_range,
  description = excluded.description,
  distinguishing_characteristics = excluded.distinguishing_characteristics,
  spotted_at = excluded.spotted_at,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  location_label = excluded.location_label,
  image_path = excluded.image_path;

insert into public.conversations (
  conversation_id, report_id, user_1_id, user_2_id
)
values (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
)
on conflict (conversation_id) do nothing;

insert into public.messages (
  message_id, conversation_id, sender_id, content
)
values (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000002',
  'I saw a cat matching Mochi near Example Park.'
)
on conflict (message_id) do update set
  content = excluded.content;
