export type ReportStatus = "LOST" | "FOUND";

export type ReportCard = {
  id: string;
  petName: string | null;
  species: string | null;
  breed: string | null;
  status: ReportStatus;
  lastSeenAt: string | null;
  locationLabel: string | null;
  imageUrl: string | null;
};
