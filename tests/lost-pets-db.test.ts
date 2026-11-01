jest.mock("server-only", () => ({}), { virtual: true });

import {
  createPetProfile,
  deletePetProfile,
} from "@/features/pets/application";
import { PetProfileInUseError } from "@/features/pets/errors";
import type { NewLostPetReportInput } from "@/features/lost-pets/types";
import {
  createReportForOwnedPet,
  getReportForViewer,
  getRecentFoundReports,
  removeLostPetReport,
  updateLostPetReport,
} from "@/features/lost-pets/application";
import { updatePetProfile } from "@/features/pets/application";
import { getPrismaClient } from "@/lib/db/client";
import {
  dummyImageUpload,
  dummyPetImageStorage,
  dummyUsers,
} from "./fixtures/dummy-data";
import { isLocalDatabase } from "./helpers/local-environment";

(isLocalDatabase ? describe : describe.skip)("lost pet report database", () => {
  it("creates reports transactionally and restricts changes to the owner", async () => {
    const prisma = getPrismaClient();
    let petId: string | undefined;
    let disposablePetId: string | undefined;
    let reportId: string | undefined;

    try {
      const reportColumns = await prisma.$queryRaw<
        { column_name: string }[]
      >`select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'lost_pet_reports'`;
      const petColumns = await prisma.$queryRaw<
        { column_name: string }[]
      >`select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'pets'`;
      const reportColumnNames = reportColumns.map(
        ({ column_name }) => column_name,
      );
      expect(reportColumnNames).toEqual(
        expect.arrayContaining([
          "report_id",
          "last_seen_lat",
          "last_seen_lng",
          "last_seen_address",
        ]),
      );
      for (const duplicateColumn of [
        "id",
        "owner_id",
        "pet_name",
        "species",
        "breed",
        "image_path",
        "last_seen_location",
        "location_label",
        "latitude",
        "longitude",
      ]) {
        expect(reportColumnNames).not.toContain(duplicateColumn);
      }
      const petColumnNames = petColumns.map(({ column_name }) => column_name);
      expect(petColumnNames).toContain("pet_id");
      expect(petColumnNames).not.toContain("id");
      expect(petColumnNames).not.toContain("image_path");

      const pet = await createPetProfile(
        {
          ownerId: dummyUsers.owner.userId,
          authUserId: dummyUsers.owner.authProviderId,
          input: {
            name: "Local database test pet",
            species: "dog",
            breed: "Mixed",
            color: "Brown",
            size: "medium",
            age: 4,
            description: null,
            dateOfBirth: null,
          },
          image: dummyImageUpload("report.png"),
        },
        dummyPetImageStorage,
      );
      petId = pet.id;
      const reportInput = {
        weightRange: "26–50 lbs",
        description: "Synthetic integration test row.",
        lastSeenAt: new Date("2026-10-30T12:00:00.000Z"),
        latitude: 33.75,
        longitude: -84.39,
        locationLabel: "Local test location",
        contactMethod: "email",
        contactValue: "owner@example.test",
        contactInstructions: "Email with a recent photo.",
      } satisfies NewLostPetReportInput;
      await expect(
        createReportForOwnedPet(
          {
            petId: pet.id,
            ownerId: dummyUsers.finder.userId,
            report: reportInput,
          },
        ),
      ).rejects.toThrow("Choose one of your Pet Profiles.");
      await expect(
        deletePetProfile(
          { petId: pet.id, ownerId: dummyUsers.finder.userId },
          dummyPetImageStorage,
        ),
      ).resolves.toEqual({ kind: "not-found" });
      const report = await createReportForOwnedPet(
        {
          petId: pet.id,
          ownerId: dummyUsers.owner.userId,
          report: reportInput,
        },
      );
      reportId = report.id;

      await expect(
        deletePetProfile(
          { petId: pet.id, ownerId: dummyUsers.owner.userId },
          dummyPetImageStorage,
        ),
      ).rejects.toBeInstanceOf(PetProfileInUseError);

      expect(report.id).toEqual(expect.any(String));
      expect(await getReportForViewer(report.id)).toMatchObject({
        imagePath: `${dummyUsers.owner.authProviderId}/pets/report.png`,
        contactMethod: null,
        contactValue: null,
        contactInstructions: null,
      });
      expect(
        await getReportForViewer(
          report.id,
          dummyUsers.finder.userId,
        ),
      ).toMatchObject({
        contactMethod: "email",
        contactValue: "owner@example.test",
        contactInstructions: "Email with a recent photo.",
      });
      const updatedProfile = {
        name: "Local database test pet",
        species: "dog" as const,
        breed: "Mixed",
        color: "Brown",
        size: "medium" as const,
        age: 4,
        description: null,
        dateOfBirth: null,
      };
      await expect(
        updatePetProfile(
          {
            petId: pet.id,
            ownerId: dummyUsers.owner.userId,
            authUserId: dummyUsers.owner.authProviderId,
            input: updatedProfile,
            imageChange: {
              kind: "upload",
              image: dummyImageUpload("report-updated.png"),
            },
          },
          dummyPetImageStorage,
        ),
      ).resolves.toBe(true);
      await expect(
        updatePetProfile(
          {
            petId: pet.id,
            ownerId: dummyUsers.owner.userId,
            authUserId: dummyUsers.owner.authProviderId,
            input: updatedProfile,
            imageChange: { kind: "unchanged" },
          },
          dummyPetImageStorage,
        ),
      ).resolves.toBe(true);
      expect(await getReportForViewer(report.id)).toMatchObject({
        imagePath: `${dummyUsers.owner.authProviderId}/pets/report-updated.png`,
      });
      expect(
        await updateLostPetReport(
          {
            reportId: report.id,
            ownerId: dummyUsers.finder.userId,
            changes: { status: "FOUND" },
          },
        ),
      ).toBe(false);
      expect(
        await prisma.lostPetReport.findUniqueOrThrow({
          where: { id: report.id },
        }),
      ).toMatchObject({
        status: "LOST",
        contactMethod: "email",
        contactValue: "owner@example.test",
      });
      expect(
        await updateLostPetReport(
          {
            reportId: report.id,
            ownerId: dummyUsers.owner.userId,
            changes: { status: "FOUND" },
          },
        ),
      ).toBe(true);
      expect(await getRecentFoundReports()).toContainEqual(
        expect.objectContaining({
          id: report.id,
          petName: "Local database test pet",
          imagePath: `${dummyUsers.owner.authProviderId}/pets/report-updated.png`,
        }),
      );
      expect(
        await removeLostPetReport(
          { reportId: report.id, ownerId: dummyUsers.owner.userId },
        ),
      ).toBe(true);
      expect(
        await prisma.lostPetReport.findUniqueOrThrow({
          where: { id: report.id },
        }),
      ).toMatchObject({ status: "REMOVED" });
      await expect(
        deletePetProfile(
          { petId: pet.id, ownerId: dummyUsers.owner.userId },
          dummyPetImageStorage,
        ),
      ).rejects.toBeInstanceOf(PetProfileInUseError);

      const disposablePet = await createPetProfile(
        {
          ownerId: dummyUsers.owner.userId,
          authUserId: dummyUsers.owner.authProviderId,
          input: {
            name: "Disposable local test pet",
            species: "dog",
            breed: null,
            color: "Brown",
            size: "small",
            age: 1,
            description: null,
            dateOfBirth: null,
          },
          image: dummyImageUpload("disposable-pet.png"),
        },
        dummyPetImageStorage,
      );
      disposablePetId = disposablePet.id;
      await expect(
        deletePetProfile(
          { petId: disposablePet.id, ownerId: dummyUsers.owner.userId },
          dummyPetImageStorage,
        ),
      ).resolves.toEqual({ kind: "deleted" });
    } finally {
      if (reportId)
        await prisma.lostPetReport.deleteMany({ where: { id: reportId } });
      if (disposablePetId)
        await prisma.pet.deleteMany({ where: { id: disposablePetId } });
      if (petId) await prisma.pet.deleteMany({ where: { id: petId } });
      await prisma.$disconnect();
    }
  });
});
