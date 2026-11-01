import { getRecentFoundReports } from "@/features/lost-pets/application";
import { getRecentReunions } from "@/features/reunions/application";
import { getPetImageUrls } from "@/lib/supabase/storage";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/features/lost-pets/application", () => ({
  getRecentFoundReports: jest.fn(),
}));
jest.mock("@/lib/supabase/storage", () => ({
  getPetImageUrls: jest.fn(),
}));

describe("getRecentReunions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("assembles found report data and Pet Profile images into public views", async () => {
    jest.mocked(getRecentFoundReports).mockResolvedValue([
      {
        id: "report-1",
        petId: "pet-1",
        petName: "Mochi",
        species: "Cat",
        breed: null,
        color: "White",
        description: null,
        locationLabel: "Example Park",
        imagePath: "dummy/mochi.png",
        lastSeenAt: new Date("2026-10-20T12:00:00.000Z"),
        reunitedAt: new Date("2026-10-21T12:00:00.000Z"),
      },
    ]);
    jest
      .mocked(getPetImageUrls)
      .mockResolvedValue(["http://127.0.0.1:54321/dummy/mochi.png"]);

    await expect(getRecentReunions(getPetImageUrls)).resolves.toEqual([
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
    expect(getPetImageUrls).toHaveBeenCalledWith(["dummy/mochi.png"]);
  });
});
