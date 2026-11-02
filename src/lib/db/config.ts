export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  const connectionString = env.DATABASE_URL;
  if (!connectionString)
    throw new Error("Missing DATABASE_URL for the application database.");

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Invalid DATABASE_URL. Use a PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Invalid DATABASE_URL. Use a PostgreSQL connection URL.");
  }

  return connectionString;
}
