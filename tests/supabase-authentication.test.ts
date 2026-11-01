import {
  authenticateWithPassword,
  getAuthenticatedIdentity,
  registerWithPassword,
  signOutFromProvider,
} from "@/lib/supabase/authentication";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signUpMock = jest.fn();
const signInMock = jest.fn();
const signOutMock = jest.fn();
const getUserMock = jest.fn();

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

describe("Supabase authentication integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        signUp: signUpMock,
        signInWithPassword: signInMock,
        signOut: signOutMock,
        getUser: getUserMock,
      },
    } as never);
  });

  it("maps provider identities and ignores client role metadata", async () => {
    const user = {
      id: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
      email: "owner@example.test",
      user_metadata: { display_name: "Local Owner", role: "ADMIN" },
    };
    signUpMock.mockResolvedValue({ data: { user }, error: null });

    await expect(
      registerWithPassword(user.email, "local-password", "Local Owner"),
    ).resolves.toEqual({
      authProviderId: user.id,
      email: user.email,
      displayName: "Local Owner",
    });
    expect(signUpMock).toHaveBeenCalledWith({
      email: user.email,
      password: "local-password",
      options: { data: { display_name: "Local Owner" } },
    });
  });

  it("maps a validated password sign-in identity", async () => {
    const user = {
      id: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
      email: "owner@example.test",
      user_metadata: { display_name: "Local Owner" },
    };
    signInMock.mockResolvedValue({ data: { user }, error: null });

    await expect(
      authenticateWithPassword(user.email, "local-password"),
    ).resolves.toEqual({
      authProviderId: user.id,
      email: user.email,
      displayName: "Local Owner",
    });
  });

  it("does not expose provider details for invalid credentials", async () => {
    signInMock.mockResolvedValue({
      data: { user: null },
      error: { message: "provider-specific detail" },
    });

    await expect(
      authenticateWithPassword("owner@example.test", "wrong-password"),
    ).rejects.toThrow("Invalid email or password.");
  });

  it("uses provider-validated identity and returns null for an expired session", async () => {
    const user = {
      id: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
      email: "owner@example.test",
      user_metadata: { display_name: "Local Owner" },
    };
    getUserMock.mockResolvedValue({ data: { user }, error: null });

    await expect(getAuthenticatedIdentity()).resolves.toMatchObject({
      authProviderId: user.id,
      email: user.email,
    });

    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", message: "JWT expired" },
    });
    await expect(getAuthenticatedIdentity()).resolves.toBeNull();
  });

  it("clears the provider session and reports sign-out failure", async () => {
    signOutMock.mockResolvedValue({ error: null });
    await expect(signOutFromProvider()).resolves.toBeUndefined();

    signOutMock.mockResolvedValue({ error: new Error("provider detail") });
    await expect(signOutFromProvider()).rejects.toThrow("Unable to sign out.");
  });
});
