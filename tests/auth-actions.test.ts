import { signIn, signOut, signUp } from "@/app/auth/actions";
import { ensureApplicationUser } from "@/features/identity/application";
import {
  authenticateWithPassword,
  registerWithPassword,
  signOutFromProvider,
} from "@/lib/supabase/authentication";

jest.mock("@/features/identity/application", () => ({
  ensureApplicationUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/supabase/authentication", () => ({
  authenticateWithPassword: jest.fn(),
  registerWithPassword: jest.fn(),
  signOutFromProvider: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

describe("signUp action", () => {
  const identity = {
    authProviderId: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
    email: "owner@example.test",
    displayName: "Local Owner",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureApplicationUser).mockResolvedValue(undefined);
    jest.mocked(signOutFromProvider).mockResolvedValue(undefined);
  });

  it("creates the app profile without forwarding a client role", async () => {
    jest.mocked(registerWithPassword).mockResolvedValue(identity);

    const formData = new FormData();
    formData.set("email", ` ${identity.email} `);
    formData.set("password", "  local-password  ");
    formData.set("displayName", " Local Owner ");
    formData.set("role", "ADMIN");

    await expect(signUp(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/?registered=1",
    );

    expect(registerWithPassword).toHaveBeenCalledWith(
      identity.email,
      "  local-password  ",
      "Local Owner",
    );
    expect(ensureApplicationUser).toHaveBeenCalledWith(identity);
  });

  it("redirects with a safe message when registration fails", async () => {
    jest
      .mocked(registerWithPassword)
      .mockRejectedValue(new Error("provider details"));

    await expect(signUp(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/sign-up?error=Unable%20to%20create%20account.",
    );
    expect(ensureApplicationUser).not.toHaveBeenCalled();
  });

  it("signs out when application-profile creation fails after registration", async () => {
    jest.mocked(registerWithPassword).mockResolvedValue(identity);
    jest
      .mocked(ensureApplicationUser)
      .mockRejectedValue(new Error("database details"));
    jest
      .mocked(signOutFromProvider)
      .mockRejectedValue(new Error("sign-out details"));

    await expect(signUp(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/sign-up?error=Unable%20to%20create%20account.",
    );
    expect(signOutFromProvider).toHaveBeenCalled();
  });

  it("allows provider confirmation flows that return no authenticated identity", async () => {
    jest.mocked(registerWithPassword).mockResolvedValue(null);

    await expect(signUp(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/?registered=1",
    );
    expect(ensureApplicationUser).not.toHaveBeenCalled();
  });
});

describe("signIn action", () => {
  const identity = {
    authProviderId: "8da27379-b0c1-49fd-8f94-a8f405a63b67",
    email: "owner@example.test",
    displayName: "Local Owner",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(ensureApplicationUser).mockResolvedValue(undefined);
    jest.mocked(signOutFromProvider).mockResolvedValue(undefined);
  });

  it("loads the application identity before redirecting", async () => {
    jest.mocked(authenticateWithPassword).mockResolvedValue(identity);
    const formData = new FormData();
    formData.set("email", ` ${identity.email} `);
    formData.set("password", "  local-password  ");

    await expect(signIn(formData)).rejects.toThrow("NEXT_REDIRECT:/");
    expect(authenticateWithPassword).toHaveBeenCalledWith(
      identity.email,
      "  local-password  ",
    );
    expect(ensureApplicationUser).toHaveBeenCalledWith(identity);
  });

  it("returns a generic error for invalid credentials", async () => {
    jest
      .mocked(authenticateWithPassword)
      .mockRejectedValue(new Error("provider details"));

    await expect(signIn(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?error=Invalid%20email%20or%20password.",
    );
    expect(ensureApplicationUser).not.toHaveBeenCalled();
  });

  it("clears the session when application-profile loading fails", async () => {
    jest.mocked(authenticateWithPassword).mockResolvedValue(identity);
    jest
      .mocked(ensureApplicationUser)
      .mockRejectedValue(new Error("database details"));
    jest
      .mocked(signOutFromProvider)
      .mockRejectedValue(new Error("sign-out details"));

    await expect(signIn(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/sign-in?error=Unable%20to%20load%20your%20account.",
    );
    expect(signOutFromProvider).toHaveBeenCalled();
  });
});

describe("signOut action", () => {
  it("signs out through the provider and redirects home", async () => {
    jest.mocked(signOutFromProvider).mockResolvedValue(undefined);

    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(signOutFromProvider).toHaveBeenCalled();
  });
});
