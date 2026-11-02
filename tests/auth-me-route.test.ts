import { GET } from "@/app/api/auth/me/route";
import type { getCurrentApplicationUser } from "@/features/identity/application";
import { getOptionalUser } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getOptionalUser: jest.fn(),
}));

const applicationUser = {
  userId: "app-user",
  authProviderId: "auth-user",
  email: "owner@example.test",
  displayName: "Owner",
  role: "USER",
} satisfies NonNullable<Awaited<ReturnType<typeof getCurrentApplicationUser>>>;

describe("GET /api/auth/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an unauthenticated request", async () => {
    jest.mocked(getOptionalUser).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("distinguishes an authenticated identity without an application profile", async () => {
    jest.mocked(getOptionalUser).mockResolvedValue({
      identity: {
        authProviderId: "auth-user",
        email: "owner@example.test",
        displayName: "Owner",
      },
      actor: null,
    });

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Application profile not found.",
    });
  });

  it("returns only the authenticated caller's application identity", async () => {
    jest.mocked(getOptionalUser).mockResolvedValue({
      identity: {
        authProviderId: "auth-user",
        email: "owner@example.test",
        displayName: "Owner",
      },
      actor: applicationUser,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      userId: "app-user",
      displayName: "Owner",
      role: "USER",
    });
  });
});
