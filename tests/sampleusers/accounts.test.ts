import { readFileSync } from "node:fs";
import { join } from "node:path";

interface TestAccount {
  id: string;
  email: string;
  display_name: string;
  auth_created_at: string;
  profile_created_at: string;
  profile: {
    id: string;
    display_name: string;
    created_at: string;
  };
  admin_intended: boolean;
  admin_note?: string;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^.+@example\.invalid$/;

const accounts = JSON.parse(
  readFileSync(join(__dirname, "accounts.json"), "utf8"),
) as TestAccount[];

describe("sample test accounts (tests/sampleusers/accounts.json)", () => {
  it("contains exactly 5 accounts", () => {
    expect(accounts).toHaveLength(5);
  });

  it("targets the actual committed auth field set", () => {
    for (const account of accounts) {
      expect(account).toHaveProperty("id");
      expect(account).toHaveProperty("email");
      expect(account).toHaveProperty("display_name");
      expect(account).toHaveProperty("auth_created_at");
      expect(account).toHaveProperty("profile_created_at");
      expect(account).toHaveProperty("profile");

      expect(typeof account.id).toBe("string");
      expect(account.email).toEqual(expect.stringMatching(EMAIL_PATTERN));
      expect(typeof account.display_name).toBe("string");
      expect(account.auth_created_at).toEqual(expect.any(String));
      expect(account.profile_created_at).toEqual(expect.any(String));

      expect(account.profile).toEqual({
        id: account.id,
        display_name: account.display_name,
        created_at: account.profile_created_at,
      });
    }
  });

  it("uses valid sample UUIDv4 identifiers", () => {
    for (const account of accounts) {
      expect(account.id).toEqual(expect.stringMatching(UUID_V4));
      expect(account.profile.id).toEqual(account.id);
    }
  });

  it("commits no real passwords (security regression guard)", () => {
    for (const account of accounts) {
      expect(account).not.toHaveProperty("password");
      expect(account).not.toHaveProperty("raw_password");
      expect(account).not.toHaveProperty("hashed_password");
    }

    const serialized = JSON.stringify(accounts);
    expect(serialized.toLowerCase()).not.toContain("password");
  });

  it("flags exactly one intended admin account", () => {
    const admins = accounts.filter((a) => a.admin_intended);
    expect(admins).toHaveLength(1);
  });
});
