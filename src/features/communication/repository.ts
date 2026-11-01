import "server-only";

import { Prisma } from "@prisma/client";

import { getPrismaClient } from "@/lib/db/client";

export async function createOrFindReportConversation(
  reportId: string,
  finderId: string,
) {
  const prisma = getPrismaClient();
  const report = await prisma.lostPetReport.findUnique({
    where: { id: reportId },
    select: { pet: { select: { ownerId: true } }, status: true },
  });
  if (!report || report.status !== "LOST" || report.pet.ownerId === finderId)
    return null;
  const ownerId = report.pet.ownerId;

  const user1Id = finderId < ownerId ? finderId : ownerId;
  const user2Id = finderId < ownerId ? ownerId : finderId;
  const where = { reportId_user1Id_user2Id: { reportId, user1Id, user2Id } };
  const existing = await prisma.conversation.findUnique({
    where,
    select: { id: true },
  });
  if (existing) return existing;

  try {
    return await prisma.conversation.create({
      data: {
        reportId,
        user1Id,
        user2Id,
      },
      select: { id: true },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    )
      throw error;
    return prisma.conversation.findUnique({ where, select: { id: true } });
  }
}

export async function createMessageForParticipant(
  conversationId: string,
  senderId: string,
  content: string,
) {
  return getPrismaClient().$transaction(async (transaction) => {
    const reports = await transaction.$queryRaw<{ report_id: string }[]>`
      SELECT r.report_id FROM public.lost_pet_reports r
      JOIN public.conversations c ON c.report_id = r.report_id
      WHERE c.conversation_id = ${conversationId}::uuid
        AND (c.user_1_id = ${senderId}::uuid OR c.user_2_id = ${senderId}::uuid)
        AND r.status = 'LOST'
      FOR UPDATE OF r
    `;
    if (reports.length === 0) return false;
    await transaction.message.create({ data: { conversationId, senderId, content } });
    return true;
  });
}

export async function listConversationsForParticipant(userId: string) {
  const prisma = getPrismaClient();
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
      user1: { select: { displayName: true } },
      user2: { select: { displayName: true } },
      createdAt: true,
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      report: {
        select: {
          pet: { select: { name: true, species: true, breed: true } },
        },
      },
    },
  });
  conversations.sort((left, right) => {
    const leftActivity = left.messages[0]?.createdAt ?? left.createdAt;
    const rightActivity = right.messages[0]?.createdAt ?? right.createdAt;
    return rightActivity.getTime() - leftActivity.getTime();
  });
  return conversations.map((conversation) => {
    return {
      id: conversation.id,
      updatedAt:
        conversation.messages[0]?.createdAt ?? conversation.createdAt,
      otherDisplayName:
        conversation.user1Id === userId
          ? conversation.user2.displayName
          : conversation.user1.displayName,
      report: {
        petName: conversation.report.pet.name,
        species: conversation.report.pet.species,
        breed: conversation.report.pet.breed,
      },
    };
  });
}

export async function findThreadForParticipant(
  conversationId: string,
  userId: string,
) {
  const prisma = getPrismaClient();
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
      user1: { select: { displayName: true } },
      user2: { select: { displayName: true } },
      report: {
        select: {
          status: true,
          locationLabel: true,
          pet: { select: { name: true, species: true, breed: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });
  if (!conversation) return null;

  return {
    id: conversation.id,
    otherDisplayName:
      conversation.user1Id === userId
        ? conversation.user2.displayName
        : conversation.user1.displayName,
    report: {
      status: conversation.report.status,
      petName: conversation.report.pet.name,
      species: conversation.report.pet.species,
      breed: conversation.report.pet.breed,
      locationLabel: conversation.report.locationLabel,
    },
    messages: conversation.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      text: message.content,
      createdAt: message.createdAt,
    })),
  };
}
