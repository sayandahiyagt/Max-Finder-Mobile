import "server-only";

import {
  createMessageForParticipant,
  createOrFindReportConversation,
  findThreadForParticipant,
  listConversationsForParticipant,
} from "./repository";

export function getConversationsForUser(userId: string) {
  if (!userId) throw new Error("An authenticated user is required.");
  return listConversationsForParticipant(userId);
}

export function getConversationThread({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  if (!conversationId || !userId)
    throw new Error("An authenticated user and conversation are required.");
  return findThreadForParticipant(conversationId, userId);
}

export function startReportConversation({
  reportId,
  finderId,
}: {
  reportId: string;
  finderId: string;
}) {
  if (!reportId || !finderId)
    throw new Error("A report and authenticated finder are required.");
  return createOrFindReportConversation(reportId, finderId);
}

export async function sendConversationMessage(
  {
    conversationId,
    senderId,
    content,
  }: {
    conversationId: string;
    senderId: string;
    content: string;
  },
) {
  const message = content.trim();
  if (!conversationId || !senderId || !message || message.length > 2000) {
    throw new Error("Enter a message.");
  }
  return createMessageForParticipant(conversationId, senderId, message);
}
