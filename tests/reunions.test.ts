import { formatReunions, type RawReunionReport } from "@/lib/reunions";

const getImageUrl = (imagePath: string) =>
  `https://example.supabase.co/storage/v1/object/public/lost-pet-images/${imagePath}`;

describe("formatReunions", () => {
  const baseRow: RawReunionReport = {
    id: "report-1",
    pet_name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    location_label: "Brooklyn, NY",
    image_path: "pets/buddy.png",
    last_seen_at: "2026-10-01T10:00:00Z",
  };

  it("maps rows to the reunion view model with image URLs", () => {
    const rows: RawReunionReport[] = [baseRow];
    expect(formatReunions(rows, getImageUrl)).toEqual([
      {
        id: "report-1",
        petName: "Buddy",
        species: "Dog",
        breed: "Golden Retriever",
        locationLabel: "Brooklyn, NY",
        imageUrl:
          "https://example.supabase.co/storage/v1/object/public/lost-pet-images/pets/buddy.png",
        lastSeenAt: "2026-10-01T10:00:00Z",
      },
    ]);
  });

  it("returns null imageUrl when image_path is missing", () => {
    const rows: RawReunionReport[] = [
      { ...baseRow, id: "no-image", image_path: null },
    ];
    const result = formatReunions(rows, getImageUrl);
    expect(result[0].imageUrl).toBeNull();
    expect(result[0].id).toBe("no-image");
  });

  it("returns null imageUrl when image_path is undefined", () => {
    const rows: RawReunionReport[] = [
      { ...baseRow, id: "undef-image", image_path: undefined },
    ];
    const result = formatReunions(rows, getImageUrl);
    expect(result[0].imageUrl).toBeNull();
  });

  it("passes through an empty array", () => {
    expect(formatReunions([], getImageUrl)).toEqual([]);
  });

  it("preserves order of multiple rows", () => {
    const rows: RawReunionReport[] = [
      { ...baseRow, id: "first" },
      { ...baseRow, id: "second", pet_name: "Luna" },
      { ...baseRow, id: "third", pet_name: "Max" },
    ];
    const result = formatReunions(rows, getImageUrl);
    expect(result.map((r) => r.id)).toEqual(["first", "second", "third"]);
    expect(result.map((r) => r.petName)).toEqual(["Buddy", "Luna", "Max"]);
  });

  it("passes the image_path through getImageUrl", () => {
    const spy = jest.fn((path: string) => `img/${path}`);
    const rows: RawReunionReport[] = [
      { ...baseRow, image_path: "abc/123.png" },
    ];
    const result = formatReunions(rows, spy);
    expect(spy).toHaveBeenCalledWith("abc/123.png");
    expect(result[0].imageUrl).toBe("img/abc/123.png");
  });

  it("returns null imageUrl when getImageUrl throws", () => {
    const throwingGetter = () => {
      throw new Error("storage down");
    };
    const rows: RawReunionReport[] = [
      { ...baseRow, image_path: "pets/buddy.png" },
    ];
    const result = formatReunions(rows, throwingGetter);
    expect(result[0].imageUrl).toBeNull();
  });

  it("handles rows with null optional fields", () => {
    const rows: RawReunionReport[] = [
      {
        id: "minimal",
        pet_name: "Ghost",
        species: null,
        breed: null,
        location_label: null,
        image_path: null,
        last_seen_at: "2026-09-28T08:30:00Z",
      },
    ];
    const result = formatReunions(rows, getImageUrl);
    expect(result).toEqual([
      {
        id: "minimal",
        petName: "Ghost",
        species: null,
        breed: null,
        locationLabel: null,
        imageUrl: null,
        lastSeenAt: "2026-09-28T08:30:00Z",
      },
    ]);
  });
});
