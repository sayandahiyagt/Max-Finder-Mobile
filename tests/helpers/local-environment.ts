export function isLoopbackEndpoint(
  value: string | undefined,
  port: string,
) {
  if (!value) return false;
  try {
    const endpoint = new URL(value);
    return (
      ["127.0.0.1", "localhost"].includes(endpoint.hostname) &&
      endpoint.port === port
    );
  } catch {
    return false;
  }
}

export const isLocalDatabase = isLoopbackEndpoint(
  process.env.DATABASE_URL,
  "54322",
);

export const isLocalSupabase =
  isLoopbackEndpoint(process.env.TEST_SUPABASE_URL, "54321") &&
  Boolean(
    process.env.TEST_SUPABASE_KEY &&
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
  );

export const isLocalTestEnvironment = isLocalDatabase && isLocalSupabase;
