import { buildStories, type StoryCard } from "@/lib/success-stories";
import type { ReportCard } from "@/types/reports";

const found = (overwrites: Partial<ReportCard> = {}): ReportCard => ({
  id: "r1",
  petName: "Rex",
  species: "Dog",
  breed: "Labrador Retriever",
  status: "FOUND",
  lastSeenAt: "2024-02-02T00:00:00.000Z",
  locationLabel: "Brooklyn, NY",
  imageUrl: "https://example.supabase.co/storage/v1/object/public/img/rex.png",
  ...overwrites,
});

describe("foundReportsToStories", () => {
  it("converts FOUND reports into real story cards", () => {
    const stories = buildStories([found({ id: "r1" })], false);
    expect(stories).toHaveLength(1);
    expect(stories[0].label).toBe("Reunited");
    expect(stories[0].demo).toBeUndefined();
    expect(stories[0].title).toContain("Rex");
    expect(stories[0].imageUrl).toBeDefined();
  });

  it("omits LOST reports from the real stories", () => {
    const stories = buildStories(
      [found({ id: "a" }), { ...found({ id: "b" }), status: "LOST" }],
      false,
    );
    expect(stories).toHaveLength(1);
    expect(stories[0].id).toBe("a");
  });

  it("does not expose demo stories when the flag is off", () => {
    const stories = buildStories([], false);
    expect(stories).toEqual([]);
  });

  it("includes clearly-labeled demo stories only when the flag is on", () => {
    const stories = buildStories([], true);
    expect(stories.length).toBeGreaterThan(0);
    expect(stories.every((s) => s.demo === true)).toBe(true);
  });

  it("merges real and demo stories when the flag is on", () => {
    const stories = buildStories([found({ id: "real-1" })], true);
    expect(stories.some((s) => s.demo)).toBe(true);
    expect(stories.some((s) => !s.demo && s.id === "real-1")).toBe(true);
  });

  it("never fabricates a real (non-demo) claim from a demo-only report", () => {
    const stories = buildStories([], true) as StoryCard[];
    expect(stories.length).toBeGreaterThan(0);
    expect(stories.every((s) => s.demo === true)).toBe(true);
  });
});
