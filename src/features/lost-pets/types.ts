import type { WeightRange } from "@/lib/pet-options";

export const reportContactMethods = ["email", "phone", "in_app"] as const;
export type ReportContactMethod = (typeof reportContactMethods)[number];
export type EditableReportStatus = "LOST" | "FOUND";

export function isEditableReportStatus(
  value: string,
): value is EditableReportStatus {
  return value === "LOST" || value === "FOUND";
}

const reportContactMethodSet: ReadonlySet<string> = new Set(
  reportContactMethods,
);

export function isReportContactMethod(
  value: string,
): value is ReportContactMethod {
  return reportContactMethodSet.has(value);
}

export type NewLostPetReportInput = {
  weightRange: WeightRange;
  description: string;
  lastSeenAt: Date;
  latitude: number;
  longitude: number;
  locationLabel: string;
  contactMethod: ReportContactMethod;
  contactValue: string | null;
  contactInstructions: string | null;
};

export type FoundReportSummary = {
  id: string;
  petId: string;
  petName: string;
  species: string;
  breed: string | null;
  color: string;
  description: string | null;
  locationLabel: string | null;
  imagePath: string | null;
  lastSeenAt: Date;
  reunitedAt: Date;
};
