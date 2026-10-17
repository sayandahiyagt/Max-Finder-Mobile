import type { ReportCard } from "@/types/reports";

export type StoryCard = {
  id: string;
  title: string;
  summary: string;
  locationLabel: string | null;
  date: string | null;
  imageUrl: string | null;
  petName: string | null;
  label: string;
  demo?: boolean;
};

export function foundReportsToStories(reports: ReportCard[]): StoryCard[] {
  return reports
    .filter((report) => report.status === "FOUND")
    .map((report): StoryCard => ({
      id: report.id,
      title: report.petName
        ? `${report.petName} was reunited with their family`
        : "A pet was reunited with their family",
      summary:
        "This report was updated to a Found status, confirming the pet was reunited.",
      locationLabel: report.locationLabel,
      date: report.lastSeenAt,
      imageUrl: report.imageUrl,
      petName: report.petName,
      label: "Reunited",
    }));
}

export const DEMO_STORIES: StoryCard[] = [
  {
    id: "demo-1",
    title: "A community effort brought Bella home",
    summary:
      "A lost dog was reunited with her family after neighbors shared the report and a shelter volunteer recognized her.",
    locationLabel: "Capitol Hill, Seattle",
    date: "2024-09-12T00:00:00.000Z",
    imageUrl: null,
    petName: "Bella",
    label: "Reunited",
    demo: true,
  },
  {
    id: "demo-2",
    title: "Milo's journey home, one spotting at a time",
    summary:
      "After a week on the map, a community member's spotting led straight to Milo.",
    locationLabel: "Alki Beach, Seattle",
    date: "2024-08-03T00:00:00.000Z",
    imageUrl: null,
    petName: "Milo",
    label: "Reunited",
    demo: true,
  },
];

export function buildStories(
  reports: ReportCard[],
  showDemo: boolean,
): StoryCard[] {
  const real = foundReportsToStories(reports);
  const demo = showDemo ? DEMO_STORIES : [];
  return [...real, ...demo];
}
