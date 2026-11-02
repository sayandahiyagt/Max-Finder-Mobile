import { getCurrentApplicationUser } from "@/features/identity/application";
import { getAuthenticatedIdentity } from "@/lib/supabase/authentication";
import { requireUser } from "@/lib/auth";

jest.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
jest.mock("@/features/identity/application", () => ({
  getCurrentApplicationUser: jest.fn(),
}));
jest.mock("@/lib/supabase/authentication", () => ({
  getAuthenticatedIdentity: jest.fn(),
}));

const identity = {
  authProviderId: "auth-user-id",
  email: "owner@example.test",
  displayName: "Local Owner",
};
const actor = {
  userId: "application-user-id",
  authProviderId: identity.authProviderId,
  email: identity.email,
  displayName: identity.displayName,
  role: "USER",
} satisfies NonNullable<Awaited<ReturnType<typeof getCurrentApplicationUser>>>;

describe("authenticated application boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects when Supabase has no validated identity", async () => {
    jest.mocked(getAuthenticatedIdentity).mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow("REDIRECT:/sign-in");
    expect(getCurrentApplicationUser).not.toHaveBeenCalled();
  });

  it("redirects when the identity has no application profile", async () => {
    jest.mocked(getAuthenticatedIdentity).mockResolvedValue(identity);
    jest.mocked(getCurrentApplicationUser).mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow(
      "REDIRECT:/sign-in?error=account",
    );
    expect(getCurrentApplicationUser).toHaveBeenCalledWith(
      identity.authProviderId,
    );
  });

  it("returns the validated identity and application actor", async () => {
    jest.mocked(getAuthenticatedIdentity).mockResolvedValue(identity);
    jest.mocked(getCurrentApplicationUser).mockResolvedValue(actor);

    await expect(requireUser()).resolves.toEqual({ identity, actor });
  });
});
