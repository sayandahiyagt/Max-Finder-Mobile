/**
 * @param {Record<string, string>} values
 * @returns {{ apiUrl: string, databaseUrl: string, serviceRoleKey: string }}
 */
function parseLocalSupabaseStatus(values) {
  const apiUrl = values.API_URL;
  const databaseUrl = values.DB_URL;
  const serviceRoleKey = values.SERVICE_ROLE_KEY;
  const storageS3Url = values.STORAGE_S3_URL;

  let api;
  let database;
  let storage;
  try {
    database = databaseUrl ? new URL(databaseUrl) : undefined;
    storage = storageS3Url ? new URL(storageS3Url) : undefined;
    // This project's local API port is 54321. Supabase CLI 2.122 can omit
    // both API_URL and STORAGE_S3_URL from `status -o env`, so derive the
    // endpoint only from a database URL that is validated below as loopback.
    api = apiUrl
      ? new URL(apiUrl)
      : storageS3Url
        ? new URL(storageS3Url)
        : database
          ? new URL(`http://${database.hostname}:54321`)
          : undefined;
  } catch {
    throw new Error("Local Supabase returned an invalid service URL.");
  }

  if (
    !api ||
    !database ||
    !serviceRoleKey ||
    !["127.0.0.1", "localhost"].includes(api.hostname) ||
    api.port !== "54321" ||
    (!apiUrl &&
      storageS3Url &&
      (!storage ||
        storage.origin !== api.origin ||
        storage.pathname !== "/storage/v1/s3")) ||
    !["127.0.0.1", "localhost"].includes(database.hostname) ||
    database.port !== "54322"
  ) {
    throw new Error("Refusing to access services outside the local stack.");
  }

  return { apiUrl: api.origin, databaseUrl, serviceRoleKey };
}

module.exports = { parseLocalSupabaseStatus };
