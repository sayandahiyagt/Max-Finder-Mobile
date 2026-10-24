import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function requireLocalSupabase(value) {
  const url = new URL(value);
  if (!localHosts.has(url.hostname)) {
    throw new Error(
      "Development seeding is restricted to a local Supabase instance. Hosted and production projects are refused.",
    );
  }
  return url.toString().replace(/\/$/, "");
}

async function seedUser(admin, { email, displayName }) {
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  if (listError) throw listError;

  const existing = listData.users.find((user) => user.email === email);
  if (existing) return existing;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: displayName, development_seed: true },
  });
  if (error || !data.user) {
    throw error ?? new Error(`Could not create ${email}.`);
  }
  return data.user;
}

async function uploadSeedImage(admin, bucket, path, filename) {
  const fileUrl = new URL(`../supabase/seed-assets/${filename}`, import.meta.url);
  const body = await readFile(fileURLToPath(fileUrl));
  const { error } = await admin.storage.from(bucket).upload(path, body, {
    cacheControl: "3600",
    contentType: "image/webp",
    upsert: true,
  });
  if (error) throw error;
}

async function main() {
  const supabaseUrl = requireLocalSupabase(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
  );
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const maya = await seedUser(admin, {
    email: "maya.seed@maxfinder.local",
    displayName: "Maya Chen",
  });
  const jordan = await seedUser(admin, {
    email: "jordan.seed@maxfinder.local",
    displayName: "Jordan Rivera",
  });

  const { error: profileError } = await admin.from("profiles").upsert([
    { id: maya.id, display_name: "Maya Chen" },
    { id: jordan.id, display_name: "Jordan Rivera" },
  ]);
  if (profileError) throw profileError;

  await uploadSeedImage(
    admin,
    "lost-pet-images",
    "development-seed/maple.webp",
    "maple.webp",
  );
  await uploadSeedImage(
    admin,
    "lost-pet-images",
    "development-seed/luna.webp",
    "luna.webp",
  );
  await uploadSeedImage(
    admin,
    "spotting-images",
    "development-seed/terrier-spotting.webp",
    "terrier-spotting.webp",
  );
  await uploadSeedImage(
    admin,
    "spotting-images",
    "development-seed/maple.webp",
    "maple.webp",
  );

  const { error: petError } = await admin.from("pets").upsert([
    {
      id: "30000000-0000-4000-8000-000000000001",
      owner_id: maya.id,
      name: "Maple",
      species: "dog",
      breed: "Golden Retriever",
      color: "Golden",
      size: "large",
      age: 5,
      image_path: "development-seed/maple.webp",
      updated_at: "2026-10-21T20:15:00.000Z",
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      owner_id: jordan.id,
      name: "Luna",
      species: "cat",
      breed: "Domestic Shorthair",
      color: "Gray tabby and white",
      size: "small",
      age: 3,
      image_path: "development-seed/luna.webp",
      updated_at: "2026-10-20T16:45:00.000Z",
    },
  ]);
  if (petError) throw petError;

  const { error: reportError } = await admin.from("lost_pet_reports").upsert([
    {
      id: "10000000-0000-4000-8000-000000000001",
      pet_id: "30000000-0000-4000-8000-000000000001",
      owner_id: maya.id,
      pet_name: "Maple",
      species: "Dog",
      breed: "Golden Retriever",
      weight_range: "51–75 lbs",
      description: "Golden coat, teal collar, and a small white patch under her chin.",
      last_seen_at: "2026-10-21T20:15:00.000Z",
      latitude: 40.660204,
      longitude: -73.968956,
      last_seen_location: "Prospect Park West, Brooklyn, NY",
      location_label: "Prospect Park West, Brooklyn, NY",
      contact_method: "email",
      contact_value: "maya.seed@maxfinder.local",
      image_path: "development-seed/maple.webp",
      status: "LOST",
      updated_at: "2026-10-21T20:15:00.000Z",
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      pet_id: "30000000-0000-4000-8000-000000000002",
      owner_id: jordan.id,
      pet_name: "Luna",
      species: "Cat",
      breed: "Domestic Shorthair",
      weight_range: "10–25 lbs",
      description: "Gray tabby with a white chest, white paws, and a purple collar.",
      last_seen_at: "2026-10-10T13:30:00.000Z",
      latitude: 40.673718,
      longitude: -73.970673,
      last_seen_location: "Lincoln Place near 7th Avenue, Brooklyn, NY",
      location_label: "Lincoln Place near 7th Avenue, Brooklyn, NY",
      contact_method: "email",
      contact_value: "jordan.seed@maxfinder.local",
      image_path: "development-seed/luna.webp",
      status: "FOUND",
      updated_at: "2026-10-20T16:45:00.000Z",
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      pet_id: "30000000-0000-4000-8000-000000000001",
      owner_id: maya.id,
      pet_name: "Maple",
      species: "Dog",
      breed: "Golden Retriever",
      weight_range: "51–75 lbs",
      description: "Earlier resolved report retained as a success story for development.",
      last_seen_at: "2026-09-12T22:00:00.000Z",
      latitude: 40.667622,
      longitude: -73.987041,
      last_seen_location: "5th Avenue near 9th Street, Brooklyn, NY",
      location_label: "5th Avenue near 9th Street, Brooklyn, NY",
      contact_method: "email",
      contact_value: "maya.seed@maxfinder.local",
      image_path: "development-seed/maple.webp",
      status: "FOUND",
      updated_at: "2026-09-13T18:20:00.000Z",
    },
  ]);
  if (reportError) throw reportError;

  const { error: spottingError } = await admin.from("spottings").upsert([
    {
      id: "20000000-0000-4000-8000-000000000001",
      species: "Dog",
      breed: "Terrier mix",
      weight_range: "10–25 lbs",
      description: "Small black-and-white dog moving north along the greenway.",
      distinguishing_characteristics: "Red collar, white blaze, white-tipped tail.",
      spotted_at: "2026-10-22T21:10:00.000Z",
      latitude: 40.665864,
      longitude: -73.971213,
      location_label: "Prospect Park West near 3rd Street, Brooklyn, NY",
      image_path: "development-seed/terrier-spotting.webp",
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      species: "Dog",
      breed: "Golden Retriever",
      weight_range: "51–75 lbs",
      description: "Friendly golden dog seen near the meadow before heading east.",
      distinguishing_characteristics: "Teal collar and a small white patch under the chin.",
      spotted_at: "2026-10-21T21:05:00.000Z",
      latitude: 40.661102,
      longitude: -73.967431,
      location_label: "Long Meadow, Prospect Park, Brooklyn, NY",
      image_path: "development-seed/maple.webp",
    },
  ]);
  if (spottingError) throw spottingError;

  console.info("Development seed complete: 2 users, 2 pets, 3 reports, and 2 spottings.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown seed error.";
  console.error(`Development seed failed: ${message}`);
  process.exitCode = 1;
});
