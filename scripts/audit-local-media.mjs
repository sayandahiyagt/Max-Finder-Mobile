import { Client } from "pg";
import nextEnv from "@next/env";
import { assertLocalDockerContext } from "./helpers/local-docker-context.mjs";

nextEnv.loadEnvConfig(process.cwd());
assertLocalDockerContext();

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!databaseUrl || !supabaseUrl) {
  process.stderr.write(
    "Run 'npm run db:configure' to create local settings first.\n",
  );
  process.exit(2);
}

let database;
let supabase;
try {
  database = new URL(databaseUrl);
  supabase = new URL(supabaseUrl);
} catch {
  process.stderr.write("Local Supabase settings contain an invalid URL.\n");
  process.exit(2);
}
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.port !== "54322" ||
  !["127.0.0.1", "localhost"].includes(supabase.hostname) ||
  supabase.port !== "54321"
) {
  process.stderr.write(
    "Refusing media audit unless both database and Supabase URLs are local.\n",
  );
  process.exit(2);
}

const client = new Client({ connectionString: databaseUrl });
let transactionStarted = false;
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  transactionStarted = true;
  const { rows } = await client.query(
    `select object.bucket_id, object.name, object.created_at
       from storage.objects object
      where object.bucket_id in ('pet-images', 'lost-pet-images', 'spotting-images')
        and not exists (
          select 1 from public.pet_images image
           where image.storage_path = object.name
             and object.bucket_id = 'pet-images'
        )
        and not exists (
          select 1 from public.spottings spotting
           where object.bucket_id = 'spotting-images'
             and spotting.image_path = object.name
        )
      order by object.created_at, object.bucket_id, object.name`,
  );
  await client.query("ROLLBACK");
  transactionStarted = false;

  if (rows.length === 0) {
    process.stdout.write(
      "Read-only local media audit found no unreferenced image paths.\n",
    );
  } else {
    process.stdout.write(
      `Read-only local media audit found ${rows.length} candidate object(s) without a matching database path:\n`,
    );
    for (const row of rows) {
      process.stdout.write(
        `${row.bucket_id}/${row.name} (created ${row.created_at.toISOString()})\n`,
      );
    }
    process.stdout.write(
      "Review each candidate before cleanup; this command never changes storage or database rows.\n",
    );
  }
} catch {
  if (transactionStarted) await client.query("ROLLBACK").catch(() => undefined);
  process.stderr.write("Local media audit failed; no data was changed.\n");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
