import {
  ensureApplicationUser,
  updateApplicationDisplayName,
} from "@/features/identity/application";
import { getDatabaseUrl } from "@/lib/db/config";

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
});
