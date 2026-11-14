import { readFileSync } from "node:fs";

export function getLocalDatabaseUrl(envFilePath = ".env.local") {
  let contents;
  try {
    contents = readFileSync(envFilePath, "utf8");
  } catch {
    throw new Error("Run `npm run db:configure` first; DATABASE_URL is required in .env.local.");
  }

  const rawValue = contents.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
  if (!rawValue) {
    throw new Error("DATABASE_URL is missing from .env.local.");
  }

  const value = rawValue.replace(/^(["'])(.*)\1$/, "$2");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL in .env.local is invalid.");
  }

  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    parsed.port !== "54322"
  ) {
    throw new Error("Refusing to use DATABASE_URL unless it targets local Supabase PostgreSQL.");
  }
  return value;
}
