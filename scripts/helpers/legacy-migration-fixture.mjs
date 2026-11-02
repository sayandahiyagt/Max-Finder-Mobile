import assert from "node:assert/strict";

export async function insertLegacyFixture(client) {
  await client.query(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    values
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-8000-000000000101',
        'authenticated', 'authenticated', 'legacy-owner@example.test',
        'synthetic-not-a-password', now(), '{"provider":"email"}',
        '{"display_name":"Legacy Owner"}', now(), now()
      ),
      (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-8000-000000000102',
        'authenticated', 'authenticated', 'legacy-finder@example.test',
        'synthetic-not-a-password', now(), '{"provider":"email"}',
        '{"display_name":"Legacy Finder"}', now(), now()
      );

    insert into public.pets (
      id, owner_id, name, species, breed, color, size, age, image_path
    ) values (
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000101',
      'Legacy Mochi', 'cat', 'Domestic Shorthair', 'Gray tabby', 'small', 5,
      '00000000-0000-4000-8000-000000000101/pets/legacy-mochi.jpg'
    );

    insert into public.lost_pet_reports (
      id, pet_id, owner_id, status, last_seen_at, last_seen_location,
      contact_method, contact_value, latitude, longitude, pet_name, species,
      breed, weight_range, description, location_label, image_path
    ) values
      (
        '00000000-0000-4000-8000-000000000301',
        '00000000-0000-4000-8000-000000000201',
        '00000000-0000-4000-8000-000000000101',
        'LOST', '2026-10-20T18:30:00Z', 'Old schema location',
        'email', 'owner@example.test', 40.7128, -74.006,
        'Legacy Mochi', 'Cat', 'Domestic Shorthair', 'Under 10 lbs',
        'Synthetic legacy lost report.', 'Legacy Park',
        '00000000-0000-4000-8000-000000000101/pets/legacy-mochi.jpg'
      ),
      (
        '00000000-0000-4000-8000-000000000302',
        '00000000-0000-4000-8000-000000000201',
        '00000000-0000-4000-8000-000000000101',
        'FOUND', '2026-10-21T18:30:00Z', 'Old schema location',
        'phone', '+15550101010', 40.713, -74.005,
        'Legacy Mochi', 'Cat', 'Domestic Shorthair', 'Under 10 lbs',
        'Synthetic legacy found report.', 'Legacy Park',
        '00000000-0000-4000-8000-000000000101/pets/legacy-mochi.jpg'
      );

    insert into public.conversations (
      id, report_id, finder_id, owner_id, lost_pet_report_id, participant_id
    ) values (
      '00000000-0000-4000-8000-000000000401',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000102'
    );

    insert into public.messages (
      id, conversation_id, sender_id, body, content, read_at
    ) values (
      '00000000-0000-4000-8000-000000000501',
      '00000000-0000-4000-8000-000000000401',
      '00000000-0000-4000-8000-000000000102',
      'I saw Mochi by Legacy Park.', 'I saw Mochi by Legacy Park.', now()
    );
  `);
}
export async function verifyMigratedFixture(client) {
  const report = await client.query(
    `select report.report_id, report.status, report.last_seen_lat,
            report.last_seen_lng, report.last_seen_address,
            report.contact_method, report.contact_value, pet.pet_id,
            pet.owner_id, app_user.auth_provider_id, image.storage_path
     from public.lost_pet_reports report
     join public.pets pet on pet.pet_id = report.pet_id
     join public.users app_user on app_user.user_id = pet.owner_id
     join public.pet_images image on image.pet_id = pet.pet_id
     where report.report_id = $1`,
    ["00000000-0000-4000-8000-000000000301"],
  );
  assert.equal(report.rowCount, 1);
  assert.equal(
    report.rows[0].report_id,
    "00000000-0000-4000-8000-000000000301",
  );
  assert.equal(report.rows[0].status, "LOST");
  assert.equal(report.rows[0].last_seen_lat, 40.7128);
  assert.equal(report.rows[0].last_seen_lng, -74.006);
  assert.equal(report.rows[0].last_seen_address, "Legacy Park");
  assert.equal(report.rows[0].contact_method, "email");
  assert.equal(report.rows[0].contact_value, "owner@example.test");
  assert.equal(report.rows[0].pet_id, "00000000-0000-4000-8000-000000000201");
  assert.equal(
    report.rows[0].auth_provider_id,
    "00000000-0000-4000-8000-000000000101",
  );
  assert.equal(
    report.rows[0].storage_path,
    "00000000-0000-4000-8000-000000000101/pets/legacy-mochi.jpg",
  );
  assert.equal(typeof report.rows[0].owner_id, "string");
  assert.notEqual(
    report.rows[0].owner_id,
    report.rows[0].auth_provider_id,
    "application ownership should use the mapped application user ID",
  );

  const found = await client.query(
    `select status, contact_method, contact_value
     from public.lost_pet_reports where report_id = $1`,
    ["00000000-0000-4000-8000-000000000302"],
  );
  assert.deepEqual(found.rows, [
    { status: "FOUND", contact_method: "phone", contact_value: "+15550101010" },
  ]);

  const message = await client.query(
    `select conversation.user_1_id, conversation.user_2_id,
            message.sender_id, message.content, message.read_at,
            message.updated_at
     from public.conversations conversation
     join public.messages message on message.conversation_id = conversation.conversation_id
     where conversation.conversation_id = $1`,
    ["00000000-0000-4000-8000-000000000401"],
  );
  assert.equal(message.rowCount, 1);
  const [owner] = await client.query(
    `select user_id from public.users
     where auth_provider_id = '00000000-0000-4000-8000-000000000101'`,
  ).then((result) => result.rows);
  const [finder] = await client.query(
    `select user_id from public.users
     where auth_provider_id = '00000000-0000-4000-8000-000000000102'`,
  ).then((result) => result.rows);
  assert.deepEqual(
    [message.rows[0].user_1_id, message.rows[0].user_2_id],
    [owner.user_id, finder.user_id].sort(),
  );
  assert.equal(message.rows[0].sender_id, finder.user_id);
  assert.equal(message.rows[0].content, "I saw Mochi by Legacy Park.");
  assert.ok(message.rows[0].read_at instanceof Date);
  assert.ok(message.rows[0].updated_at instanceof Date);

  const oldColumns = await client.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (table_name, column_name) in (
        ('pets', 'id'), ('pets', 'image_path'),
        ('lost_pet_reports', 'owner_id'),
        ('lost_pet_reports', 'last_seen_location'),
        ('conversations', 'finder_id'),
        ('conversations', 'owner_id'),
        ('conversations', 'lost_pet_report_id'),
        ('conversations', 'participant_id'),
        ('messages', 'body')
      )
  `);
  assert.deepEqual(oldColumns.rows, []);
}
