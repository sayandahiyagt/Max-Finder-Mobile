import {
  ensureApplicationUser,
  updateApplicationDisplayName,
} from "@/features/identity/application";
import { getDatabasePoolConfig, getDatabaseUrl } from "@/lib/db/config";

jest.mock("@/features/identity/repository", () => ({
  findApplicationUser: jest.fn(),
  ensureApplicationUserRecord: jest.fn().mockResolvedValue(undefined),
  updateApplicationUserDisplayName: jest.fn().mockResolvedValue(undefined),
}));

import {
  ensureApplicationUserRecord,
  updateApplicationUserDisplayName,
} from "@/features/identity/repository";

describe("application identity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("links the provider identity without accepting a client-selected role", async () => {
    const identity = {
      authProviderId: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
      email: "owner@example.test",
      displayName: "Local Owner",
    };

    await ensureApplicationUser(identity);

    expect(ensureApplicationUserRecord).toHaveBeenCalledWith({
      authProviderId: identity.authProviderId,
      email: identity.email,
      displayName: "Local Owner",
    });
  });

  it("uses a bounded email-derived name when metadata is missing", async () => {
    const identity = {
      authProviderId: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
      email: `${"a".repeat(120)}@example.test`,
      displayName: null,
    };

    await ensureApplicationUser(identity);

    expect(ensureApplicationUserRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "a".repeat(100),
      }),
    );
  });

  it("updates an application-owned display name explicitly", async () => {
    const identity = {
      authProviderId: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
      email: "owner@example.test",
      displayName: "Old Auth Name",
    };

    await updateApplicationDisplayName(identity, "New App Name");

    expect(updateApplicationUserDisplayName).toHaveBeenCalledWith({
      authProviderId: identity.authProviderId,
      email: identity.email,
      displayName: "New App Name",
    });
  });
});

describe("database configuration", () => {
  const developmentProjectRef = "vkdfgxvdbhmymjkrycif";
  const productionProjectRef = "zbxnmkeolrcpadwzkuhp";
  const certificate = Buffer.from(
    "-----BEGIN CERTIFICATE-----\nY2VydA==\n-----END CERTIFICATE-----\n",
  ).toString("base64");

  it("requires a server database URL", () => {
    expect(() => getDatabaseUrl({})).toThrow("Missing DATABASE_URL");
  });

  it("returns the configured database URL", () => {
    expect(
      getDatabaseUrl({ DATABASE_URL: "postgresql://localhost/test" }),
    ).toBe("postgresql://localhost/test");
  });

  it("rejects malformed or non-PostgreSQL URLs", () => {
    expect(() => getDatabaseUrl({ DATABASE_URL: "not a url" })).toThrow(
      "Invalid DATABASE_URL",
    );
    expect(() =>
      getDatabaseUrl({ DATABASE_URL: "https://example.test/db" }),
    ).toThrow("Invalid DATABASE_URL");
  });

  it("uses the local Supabase database directly outside Vercel", () => {
    expect(
      getDatabasePoolConfig({
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      }),
    ).toMatchObject({
      connectionString:
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    });
  });

  it("requires Preview to use the development transaction pooler and CA", () => {
    const config = getDatabasePoolConfig({
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SUPABASE_URL: `https://${developmentProjectRef}.supabase.co`,
      DATABASE_URL: `postgresql://postgres.${developmentProjectRef}:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`,
      SUPABASE_DB_CA_CERT_BASE64: certificate,
    });

    expect(config).toMatchObject({
      max: 1,
      ssl: {
        ca: "-----BEGIN CERTIFICATE-----\nY2VydA==\n-----END CERTIFICATE-----\n",
        rejectUnauthorized: true,
      },
    });
    expect(config.connectionString).not.toContain("sslmode");
  });

  it("requires Production to use the production project and its CA", () => {
    expect(() =>
      getDatabasePoolConfig({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: `https://${productionProjectRef}.supabase.co`,
        DATABASE_URL: `postgresql://postgres.${productionProjectRef}:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      }),
    ).toThrow("SUPABASE_DB_CA_CERT_BASE64");
  });

  it("rejects a Preview database URL that points at another project", () => {
    expect(() =>
      getDatabasePoolConfig({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_SUPABASE_URL: `https://${developmentProjectRef}.supabase.co`,
        DATABASE_URL: `postgresql://postgres.${productionProjectRef}:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
        SUPABASE_DB_CA_CERT_BASE64: certificate,
      }),
    ).toThrow("development project's transaction pooler");
  });

  it("rejects the Vercel Development environment", () => {
    expect(() =>
      getDatabasePoolConfig({
        VERCEL_ENV: "development",
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      }),
    ).toThrow("Vercel Development environment is not supported");
  });
});
