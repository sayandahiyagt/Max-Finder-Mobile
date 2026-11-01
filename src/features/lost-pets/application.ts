import "server-only";

import {
  createReportForOwnedPet as persistReportForOwnedPet,
  findReportForOwner,
  findReportForViewer,
  listRecentFoundReports,
  listReportsOwnedBy,
  updateOwnedReport,
} from "./repository";
import type { NewLostPetReportInput } from "./types";

export function createReportForOwnedPet({
  petId,
  ownerId,
  report,
}: {
  petId: string;
  ownerId: string;
  report: NewLostPetReportInput;
}) {
  if (!petId || !ownerId)
    throw new Error("A Pet Profile and authenticated owner are required.");
  return persistReportForOwnedPet(petId, ownerId, report);
}

export function getReportsForOwner(ownerId: string) {
  if (!ownerId) throw new Error("An authenticated owner is required.");
  return listReportsOwnedBy(ownerId);
}

export function getOwnedReport(reportId: string, ownerId: string) {
  if (!reportId || !ownerId)
    throw new Error("A report and authenticated owner are required.");
  return findReportForOwner(reportId, ownerId);
}

export function getReportForViewer(
  reportId: string,
  viewerId?: string | null,
) {
  if (!reportId) throw new Error("A report is required.");
  return findReportForViewer(reportId, viewerId);
}

export function getRecentFoundReports() {
  return listRecentFoundReports(12);
}

export async function updateLostPetReport(
  {
    reportId,
    ownerId,
    changes,
  }: {
    reportId: string;
    ownerId: string;
    changes: { description?: string; status?: "LOST" | "FOUND" };
  },
) {
  if (!reportId || !ownerId)
    throw new Error("A report and authenticated owner are required.");
  return updateOwnedReport(reportId, ownerId, changes);
}

export async function removeLostPetReport(
  { reportId, ownerId }: { reportId: string; ownerId: string },
) {
  if (!reportId || !ownerId)
    throw new Error("A report and authenticated owner are required.");
  return updateOwnedReport(reportId, ownerId, {
    status: "REMOVED",
  });
}
