import { parseLocalSupabaseStatus } from "../scripts/helpers/local-supabase-status-values.cjs";

describe("local Supabase status parser", () => {
  const localStatus = {
    DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    SERVICE_ROLE_KEY: "local-test-key",
  };

  it("derives the API origin from the local storage URL when API_URL is absent", () => {
    expect(
      parseLocalSupabaseStatus({
        ...localStatus,
        STORAGE_S3_URL: "http://127.0.0.1:54321/storage/v1/s3",
      }),
    ).toEqual({
      apiUrl: "http://127.0.0.1:54321",
      databaseUrl: localStatus.DB_URL,
      serviceRoleKey: localStatus.SERVICE_ROLE_KEY,
    });
  });

  it("uses the configured local API port when CLI status omits both API URL fields", () => {
    expect(parseLocalSupabaseStatus(localStatus)).toEqual({
      apiUrl: "http://127.0.0.1:54321",
      databaseUrl: localStatus.DB_URL,
      serviceRoleKey: localStatus.SERVICE_ROLE_KEY,
    });
  });

  it("keeps accepting an explicit local API_URL", () => {
    expect(
      parseLocalSupabaseStatus({
        ...localStatus,
        API_URL: "http://localhost:54321",
      }).apiUrl,
    ).toBe("http://localhost:54321");
  });

  it.each([
    {
      ...localStatus,
      STORAGE_S3_URL: "https://storage.example.com/storage/v1/s3",
    },
    {
      ...localStatus,
      STORAGE_S3_URL: "http://127.0.0.1:54322/storage/v1/s3",
    },
    {
      ...localStatus,
      STORAGE_S3_URL: "http://127.0.0.1:54321/unexpected",
    },
    {
      DB_URL: "postgresql://postgres:postgres@remote.example:54322/postgres",
      SERVICE_ROLE_KEY: "local-test-key",
    },
  ])("rejects a nonlocal or unexpected storage endpoint", (status) => {
    expect(() => parseLocalSupabaseStatus(status)).toThrow(
      "Refusing to access services outside the local stack.",
    );
  });
});
