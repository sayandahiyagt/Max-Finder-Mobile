import {
  formatStoredLocationLabel,
  isPlaceholderLocationLabel,
  parseLocationSearchResults,
  parseReverseGeocodeLabel,
} from "@/lib/location-contract";

describe("parseLocationSearchResults", () => {
  it("returns trimmed, coordinate-checked results from an unknown payload", () => {
    expect(
      parseLocationSearchResults([
        { latitude: 40.7, longitude: "-74", label: " Brooklyn, NY " },
        { latitude: 91, longitude: -74, label: "Out of range" },
        { latitude: 40.7, longitude: -74, label: "  " },
        null,
      ]),
    ).toEqual([{ latitude: 40.7, longitude: -74, label: "Brooklyn, NY" }]);
  });

  it.each([null, {}, "not a list"])(
    "returns no results for malformed payload %p",
    (value) => expect(parseLocationSearchResults(value)).toEqual([]),
  );
});

describe("parseReverseGeocodeLabel", () => {
  it("returns a trimmed, bounded label", () => {
    expect(parseReverseGeocodeLabel({ label: "  Brooklyn, NY  " })).toBe(
      "Brooklyn, NY",
    );
    expect(parseReverseGeocodeLabel({ label: "x".repeat(300) })).toHaveLength(
      255,
    );
  });

  it.each([null, [], {}, { label: "  " }, { label: 5 }])(
    "rejects malformed payload %p",
    (value) => expect(parseReverseGeocodeLabel(value)).toBeNull(),
  );
});

describe("formatStoredLocationLabel", () => {
  it("keeps a useful stored address and trims surrounding whitespace", () => {
    expect(formatStoredLocationLabel("  Brooklyn, NY  ")).toBe("Brooklyn, NY");
  });

  it.each([
    null,
    undefined,
    "",
    "Current location",
    "Your current location",
    "Selected map location",
    "Finding address…",
    "Address unavailable",
  ])("uses a neutral fallback for placeholder %p", (label) => {
    expect(formatStoredLocationLabel(label)).toBe("Address unavailable");
  });
});

describe("isPlaceholderLocationLabel", () => {
  it.each([
    "Current location",
    "Your current location",
    "Selected map location",
    "Finding address",
    "Finding address…",
    "Address unavailable",
  ])("recognizes the placeholder %p", (label) => {
    expect(isPlaceholderLocationLabel(label)).toBe(true);
    expect(isPlaceholderLocationLabel(` ${label} `)).toBe(true);
  });

  it("keeps a useful saved address", () => {
    expect(isPlaceholderLocationLabel(" Brooklyn, NY ")).toBe(false);
  });
});
