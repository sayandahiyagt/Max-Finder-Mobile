jest.mock("server-only", () => ({}), { virtual: true });

import {
  getConversationThread,
  getConversationsForUser,
  sendConversationMessage,
  startReportConversation,
} from "@/features/communication/application";
import {
  createReportForOwnedPet,
  removeLostPetReport,
  updateLostPetReport,
} from "@/features/lost-pets/application";
import { createPetProfile } from "@/features/pets/application";
import {
  findRelatedSpottings,
  searchMapActivity,
} from "@/features/search/application";
import { defaultMapSearchFilters } from "@/features/search/types";
import { createSpotting, getSpotting } from "@/features/spottings/application";
import { getPrismaClient } from "@/lib/db/client";
import {
  dummyImageUpload,
  dummyPetImageStorage,
  dummySpottingImageStorage,
  dummyUsers,
} from "./fixtures/dummy-data";
import { isLocalDatabase } from "./helpers/local-environment";

function holdReportLock(
  prisma: ReturnType<typeof getPrismaClient>,
  reportId: string,
  nextStatus?: "FOUND",
) {
  let release!: () => void;
  let signalLocked!: () => void;
  const locked = new Promise<void>((resolve) => {
    signalLocked = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const transaction = prisma.$transaction(async (tx) => {
    if (nextStatus) {
      await tx.lostPetReport.update({
        where: { id: reportId },
        data: { status: nextStatus },
      });
    } else {
      await tx.$queryRaw`
        SELECT report_id
        FROM public.lost_pet_reports
        WHERE report_id = ${reportId}::uuid
        FOR UPDATE
      `;
    }
    signalLocked();
    await released;
  });
  return { locked, release, transaction };
}

async function waitForBlockedQuery(
  prisma: ReturnType<typeof getPrismaClient>,
  queryMarker: string,
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const rows = await prisma.$queryRaw<{ waiting: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
          AND query LIKE ${`%${queryMarker}%`}
      ) AS waiting
    `;
    if (rows[0]?.waiting) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

(isLocalDatabase ? describe : describe.skip)("communication database", () => {
  it("reuses report conversations and restricts messages to participants of active reports", async () => {
    const prisma = getPrismaClient();
    let petId: string | undefined;
    let reportId: string | undefined;
    let spottingId: string | undefined;
    const lastSeenAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const spottedAt = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const messageColumns = await prisma.$queryRaw<
        { column_name: string }[]
      >`select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'messages'`;
      const conversationColumns = await prisma.$queryRaw<
        { column_name: string }[]
      >`select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'conversations'`;
      const messageColumnNames = messageColumns.map(
        ({ column_name }) => column_name,
      );
      const conversationColumnNames = conversationColumns.map(
        ({ column_name }) => column_name,
      );
      expect(messageColumnNames).toEqual(
        expect.arrayContaining(["content", "updated_at", "message_id"]),
      );
      expect(messageColumnNames).not.toContain("body");
      expect(conversationColumnNames).not.toContain("lost_pet_report_id");
      expect(conversationColumnNames).not.toContain("participant_id");
      expect(conversationColumnNames).toEqual(
        expect.arrayContaining([
          "conversation_id",
          "user_1_id",
          "user_2_id",
        ]),
      );
      expect(conversationColumnNames).not.toContain("id");
      expect(conversationColumnNames).not.toContain("finder_id");
      expect(conversationColumnNames).not.toContain("owner_id");

      const pet = await createPetProfile(
        {
          ownerId: dummyUsers.owner.userId,
          authUserId: dummyUsers.owner.authProviderId,
          input: {
            name: "Local communication test pet",
            species: "dog",
            breed: "Mixed",
            color: "Black",
            size: "medium",
            age: 5,
            description: null,
            dateOfBirth: null,
          },
          image: null,
        },
        dummyPetImageStorage,
      );
      petId = pet.id;
      const report = await createReportForOwnedPet({
        petId: pet.id,
        ownerId: dummyUsers.owner.userId,
        report: {
          weightRange: "26–50 lbs",
          description: "Synthetic communication integration row.",
          lastSeenAt,
          latitude: 33.75,
          longitude: -84.39,
          locationLabel: "Local communication test location",
          contactMethod: "in_app",
          contactValue: null,
          contactInstructions: null,
        },
      });
      reportId = report.id;
      const spotting = await createSpotting({
        species: "Dog",
        breed: "Mixed",
        weightRange: "26–50 lbs",
        description: "Synthetic spotting row.",
        distinguishingCharacteristics: "Blue collar",
        spottedAt,
        latitude: 33.75,
        longitude: -84.39,
        locationLabel: "Local spotting test location",
      }, dummyImageUpload("spotting.png"), dummySpottingImageStorage);
      spottingId = spotting.id;
      const spottingDetail = await getSpotting(spotting.id);
      expect(spottingDetail).toMatchObject({
        species: "Dog",
        locationLabel: "Local spotting test location",
      });
      expect(typeof spottingDetail?.latitude).toBe("number");
      expect(typeof spottingDetail?.longitude).toBe("number");
      const activity = await searchMapActivity({
        minLat: 33.7,
        maxLat: 33.8,
        minLng: -84.5,
        maxLng: -84.3,
      });
      expect(activity.reports.map(({ id }) => id)).toContain(report.id);
      const mapReport = activity.reports.find(({ id }) => id === report.id);
      const mapSpotting = activity.spottings.find(
        ({ id }) => id === spotting.id,
      );
      expect(typeof mapReport?.latitude).toBe("number");
      expect(typeof mapReport?.longitude).toBe("number");
      expect(typeof mapSpotting?.latitude).toBe("number");
      expect(typeof mapSpotting?.longitude).toBe("number");
      const lostOnly = await searchMapActivity(
        {
          minLat: 33.7,
          maxLat: 33.8,
          minLng: -84.5,
          maxLng: -84.3,
        },
        {
          ...defaultMapSearchFilters,
          activityType: "lost",
          species: "DOG",
          breed: "mix",
          timeRangeDays: 7,
        },
      );
      expect(lostOnly.reports.map(({ id }) => id)).toContain(report.id);
      expect(lostOnly.spottings).toEqual([]);

      const radiusOnly = await searchMapActivity(
        {
          minLat: 40.7,
          maxLat: 40.8,
          minLng: -74.1,
          maxLng: -73.9,
        },
        {
          ...defaultMapSearchFilters,
          activityType: "all",
          center: { latitude: 33.75, longitude: -84.39 },
          radiusMiles: 5,
        },
      );
      expect(radiusOnly.reports.map(({ id }) => id)).toContain(report.id);
      expect(radiusOnly.spottings.map(({ id }) => id)).toContain(spotting.id);

      const spottingOnly = await searchMapActivity(
        {
          minLat: 33.7,
          maxLat: 33.8,
          minLng: -84.5,
          maxLng: -84.3,
        },
        {
          ...defaultMapSearchFilters,
          activityType: "spotted",
          species: "dog",
          breed: "mix",
          timeRangeDays: 7,
        },
      );
      expect(spottingOnly.reports).toEqual([]);
      expect(spottingOnly.spottings.map(({ id }) => id)).toContain(spotting.id);

      const outsideRadius = await searchMapActivity(
        {
          minLat: 33.7,
          maxLat: 33.8,
          minLng: -84.5,
          maxLng: -84.3,
        },
        {
          ...defaultMapSearchFilters,
          center: { latitude: 40.7, longitude: -74 },
          radiusMiles: 5,
        },
      );
      expect(outsideRadius.reports.map(({ id }) => id)).not.toContain(
        report.id,
      );
      expect(outsideRadius.spottings.map(({ id }) => id)).not.toContain(
        spotting.id,
      );
      const relatedSpottings = await findRelatedSpottings({
        species: "Dog",
        breed: "Mixed",
        weightRange: "26–50 lbs",
        description: "Synthetic spotting row.",
        latitude: 33.75,
        longitude: -84.39,
        lastSeenAt: lastSeenAt.toISOString(),
      });
      expect(relatedSpottings).toContainEqual(
        expect.objectContaining({
          spotting: expect.objectContaining({
            id: spotting.id,
            species: "Dog",
            breed: "Mixed",
            weightRange: "26–50 lbs",
            description: "Synthetic spotting row.",
            distinguishingCharacteristics: "Blue collar",
            latitude: 33.75,
            longitude: -84.39,
            spottedAt: spottedAt.toISOString(),
            locationLabel: "Local spotting test location",
            imagePath: "anonymous/spotting.png",
          }),
        }),
      );

      const finderId = dummyUsers.finder.userId;
      const resolutionLock = holdReportLock(prisma, report.id, "FOUND");
      await resolutionLock.locked;
      const creationDuringResolution = startReportConversation({
        reportId: report.id,
        finderId,
      });
      try {
        expect(
          await waitForBlockedQuery(prisma, "conversation creation report lock"),
        ).toBe(true);
      } finally {
        resolutionLock.release();
      }
      await resolutionLock.transaction;
      expect(await creationDuringResolution).toBeNull();
      await prisma.lostPetReport.update({
        where: { id: report.id },
        data: { status: "LOST" },
      });

      const creationLock = holdReportLock(prisma, report.id);
      await creationLock.locked;
      const creationBeforeResolution = startReportConversation({
        reportId: report.id,
        finderId,
      });
      const resolutionAfterCreation = prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          /* report resolution lock */
          UPDATE public.lost_pet_reports
          SET status = 'FOUND'
          WHERE report_id = ${report.id}::uuid
        `;
      });
      try {
        expect(
          await waitForBlockedQuery(prisma, "report resolution lock"),
        ).toBe(true);
      } finally {
        creationLock.release();
      }
      await creationLock.transaction;
      const createdBeforeResolution = await creationBeforeResolution;
      await resolutionAfterCreation;
      expect(createdBeforeResolution).not.toBeNull();
      expect(
        await prisma.lostPetReport.findUniqueOrThrow({
          where: { id: report.id },
          select: { status: true },
        }),
      ).toEqual({ status: "FOUND" });
      await prisma.lostPetReport.update({
        where: { id: report.id },
        data: { status: "LOST" },
      });

      const concurrent = await Promise.all([
        startReportConversation({ reportId: report.id, finderId }),
        startReportConversation({ reportId: report.id, finderId }),
      ]);
      const [first, concurrentSecond] = concurrent;
      if (!first)
        throw new Error("Expected a conversation for the active report.");
      expect(concurrentSecond?.id).toBe(first.id);
      const second = await startReportConversation({
        reportId: report.id,
        finderId,
      });
      expect(first?.id).toBe(second?.id);
      const transitionLock = holdReportLock(prisma, report.id, "FOUND");
      await transitionLock.locked;
      const concurrentSend = sendConversationMessage({ conversationId: first.id, senderId: finderId, content: "Too late" });
      try {
        expect(
          await waitForBlockedQuery(
            prisma,
            "SELECT r.report_id FROM public.lost_pet_reports",
          ),
        ).toBe(true);
      } finally {
        transitionLock.release();
      }
      await transitionLock.transaction;
      expect(await concurrentSend).toBe(false);
      await prisma.lostPetReport.update({ where: { id: report.id }, data: { status: "LOST" } });
      expect(
        await prisma.conversation.findUniqueOrThrow({
          where: { id: first.id },
        }),
      ).toMatchObject({
        user1Id: dummyUsers.owner.userId,
        user2Id: finderId,
      });
      expect(
        await startReportConversation({
          reportId: report.id,
          finderId: dummyUsers.owner.userId,
        }),
      ).toBeNull();

      expect(
        await sendConversationMessage({
          conversationId: first.id,
          senderId: finderId,
          content: "  I saw this dog nearby.  ",
        }),
      ).toBe(true);
      expect(
        await sendConversationMessage({
          conversationId: first.id,
          senderId: dummyUsers.admin.authProviderId,
          content: "Intrusion",
        }),
      ).toBe(false);
      expect(
        await prisma.message.findMany({ where: { conversationId: first.id } }),
      ).toMatchObject([
        {
          senderId: finderId,
          content: "I saw this dog nearby.",
        },
      ]);
      expect(
        await getConversationThread({
          conversationId: first.id,
          userId: dummyUsers.admin.authProviderId,
        }),
      ).toBeNull();
      expect(
        await getConversationThread({ conversationId: first.id, userId: finderId }),
      ).toMatchObject({
        otherDisplayName: "Riley Owner",
        messages: [{ text: "I saw this dog nearby." }],
      });
      await prisma.conversation.update({
        where: { id: first.id },
        data: { updatedAt: new Date("2000-01-01T00:00:00.000Z") },
      });
      const conversations = await getConversationsForUser(finderId);
      const listedConversation = conversations.find(
        ({ id }) => id === first.id,
      );
      const latestMessage = await prisma.message.findFirstOrThrow({
        where: { conversationId: first.id },
        orderBy: { createdAt: "desc" },
      });
      expect(listedConversation?.updatedAt).toEqual(latestMessage.createdAt);
      expect(conversations).toContainEqual(
        expect.objectContaining({
          id: first.id,
          otherDisplayName: "Riley Owner",
          report: expect.objectContaining({
            petName: "Local communication test pet",
          }),
        }),
      );

      expect(
        await updateLostPetReport(
          {
            reportId: report.id,
            ownerId: dummyUsers.owner.userId,
            changes: { status: "FOUND" },
          },
        ),
      ).toBe(true);
      expect(
        (
          await searchMapActivity({
            minLat: 33.7,
            maxLat: 33.8,
            minLng: -84.5,
            maxLng: -84.3,
          })
        ).reports.map(({ id }) => id),
      ).not.toContain(report.id);
      expect(
        await sendConversationMessage({
          conversationId: first.id,
          senderId: finderId,
          content: "This report is no longer active.",
        }),
      ).toBe(false);
      await expect(
        getConversationThread({ conversationId: first.id, userId: finderId }),
      ).resolves.toMatchObject({
        messages: [{ text: "I saw this dog nearby." }],
      });
      expect(
        await removeLostPetReport(
          { reportId: report.id, ownerId: dummyUsers.owner.userId },
        ),
      ).toBe(true);
      await expect(
        getConversationThread({ conversationId: first.id, userId: finderId }),
      ).resolves.toMatchObject({
        messages: [{ text: "I saw this dog nearby." }],
      });
      expect(
        await sendConversationMessage({
          conversationId: first.id,
          senderId: finderId,
          content: "This report was removed.",
        }),
      ).toBe(false);
    } finally {
      if (reportId)
        await prisma.lostPetReport.deleteMany({ where: { id: reportId } });
      if (spottingId)
        await prisma.spotting.deleteMany({ where: { id: spottingId } });
      if (petId) await prisma.pet.deleteMany({ where: { id: petId } });
      await prisma.$disconnect();
    }
  });
});
