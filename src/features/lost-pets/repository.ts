import "server-only";

import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/client";
import type { FoundReportSummary, NewLostPetReportInput } from "./types";

const viewerReportFields = {
  id: true,
  status: true,
  lastSeenAt: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  weightRange: true,
  description: true,
  locationLabel: true,
  pet: {
    select: {
      ownerId: true,
      name: true,
      species: true,
      breed: true,
      profileImage: { select: { storagePath: true } },
    },
  },
} satisfies Prisma.LostPetReportSelect;

type ViewerReport = Prisma.LostPetReportGetPayload<{
  select: typeof viewerReportFields;
}>;

function mapViewerReport(result: ViewerReport) {
  const { pet, ...visible } = result;
  return {
    ...visible,
    ownerId: pet.ownerId,
    petName: pet.name,
    species: pet.species,
    breed: pet.breed,
    imagePath: pet.profileImage?.storagePath ?? null,
  };
}

export function createReportForOwnedPet(
  petId: string,
  ownerId: string,
  report: NewLostPetReportInput,
) {
  return getPrismaClient().$transaction(async (transaction) => {
    const pet = await transaction.pet.findFirst({
      where: { id: petId, ownerId: ownerId },
      select: { id: true },
    });
    if (!pet) throw new Error("Choose one of your Pet Profiles.");

    return transaction.lostPetReport.create({
      data: {
        petId,
        status: "LOST",
        lastSeenAt: report.lastSeenAt,
        contactMethod: report.contactMethod,
        contactValue: report.contactValue,
        contactInstructions: report.contactInstructions,
        latitude: report.latitude,
        longitude: report.longitude,
        weightRange: report.weightRange,
        description: report.description,
        locationLabel: report.locationLabel,
      },
      select: { id: true },
    });
  });
}

export function listReportsOwnedBy(ownerId: string) {
  return getPrismaClient().lostPetReport.findMany({
    where: { pet: { is: { ownerId: ownerId } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      pet: { select: { name: true } },
      status: true,
      lastSeenAt: true,
      locationLabel: true,
    },
  }).then((reports) =>
    reports.map(({ pet, ...report }) => ({ ...report, petName: pet.name })),
  );
}

export function findReportForOwner(reportId: string, ownerId: string) {
  return getPrismaClient().lostPetReport.findFirst({
    where: {
      id: reportId,
      pet: { is: { ownerId: ownerId } },
    },
    select: {
      id: true,
      pet: { select: { name: true } },
      status: true,
      description: true,
    },
  }).then((report) =>
    report ? { ...report, petName: report.pet.name } : null,
  );
}

export async function findReportForViewer(
  reportId: string,
  viewerId?: string | null,
) {
  const publicStatuses = { status: { in: ["LOST", "FOUND"] } };
  const ownerAccess = viewerId
    ? [{ pet: { is: { ownerId: viewerId } } }]
    : [];
  const where = { id: reportId, OR: [publicStatuses, ...ownerAccess] };
  const report = getPrismaClient().lostPetReport;

  if (viewerId) {
    const result = await report.findFirst({
      where,
      select: {
        ...viewerReportFields,
        contactMethod: true,
        contactValue: true,
        contactInstructions: true,
      },
    });
    if (!result) return null;
    return {
      ...mapViewerReport(result),
      contactMethod: result.contactMethod,
      contactValue: result.contactValue,
      contactInstructions: result.contactInstructions,
    };
  }

  const result = await report.findFirst({
    where,
    select: viewerReportFields,
  });
  if (!result) return null;
  return {
    ...mapViewerReport(result),
    contactMethod: null,
    contactValue: null,
    contactInstructions: null,
  };
}

export async function listRecentFoundReports(
  limit: number,
): Promise<FoundReportSummary[]> {
  const reports = await getPrismaClient().lostPetReport.findMany({
    where: { status: "FOUND" },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      petId: true,
      description: true,
      locationLabel: true,
      lastSeenAt: true,
      updatedAt: true,
      pet: {
        select: {
          name: true,
          species: true,
          breed: true,
          color: true,
          profileImage: { select: { storagePath: true } },
        },
      },
    },
  });

  return reports.map((report) => ({
    id: report.id,
    petId: report.petId,
    petName: report.pet.name,
    species: report.pet.species,
    breed: report.pet.breed,
    color: report.pet.color,
    description: report.description,
    locationLabel: report.locationLabel,
    imagePath: report.pet.profileImage?.storagePath ?? null,
    lastSeenAt: report.lastSeenAt,
    reunitedAt: report.updatedAt,
  }));
}

export async function updateOwnedReport(
  reportId: string,
  ownerId: string,
  changes: { description?: string; status?: "LOST" | "FOUND" | "REMOVED" },
) {
  const result = await getPrismaClient().lostPetReport.updateMany({
    where: {
      id: reportId,
      pet: { is: { ownerId: ownerId } },
    },
    data: changes,
  });
  return result.count === 1;
}
