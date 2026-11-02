import { GET } from "@/app/api/reunions/route";
import { getRecentReunions } from "@/features/reunions/application";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/features/reunions/application", () => ({
  getRecentReunions: jest.fn(),
}));

describe("GET /api/reunions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns found reports with their image URLs", async () => {
    jest.mocked(getRecentReunions).mockResolvedValue([
      {
        id: "report-1",
        petName: "Mochi",
        species: "Cat",
        breed: null,
        color: "White",
        description: null,
        locationLabel: "Example Park",
        imageUrl: "http://127.0.0.1:54321/dummy/mochi.png",
        lastSeenAt: "2026-10-20T12:00:00.000Z",
        reunitedAt: "2026-10-21T12:00:00.000Z",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reunions: [
        {
          id: "report-1",
          petName: "Mochi",
          imageUrl: "http://127.0.0.1:54321/dummy/mochi.png",
        },
      ],
    });
  });

  it("returns the same service error when assembling reunions fails", async () => {
    jest
      .mocked(getRecentReunions)
      .mockRejectedValue(new Error("local Storage unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Reunions are temporarily unavailable.",
    });
  });
});
