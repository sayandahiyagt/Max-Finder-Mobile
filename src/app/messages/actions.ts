"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  sendConversationMessage,
  startReportConversation,
} from "@/features/communication/application";
import { readTextField } from "@/lib/form-data";
import { requireUser } from "@/lib/auth";

export async function createConversation(formData: FormData) {
  const { actor } = await requireUser();
  const reportId = readTextField(formData, "reportId", 80);
  if (!reportId) throw new Error("A lost-pet report is required.");

  const conversation = await startReportConversation({
    reportId,
    finderId: actor.userId,
  });
  if (!conversation)
    throw new Error("This lost-pet report is unavailable for messaging.");
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(formData: FormData) {
  const { actor } = await requireUser();
  const conversationId = readTextField(formData, "conversationId", 80);
  const content = readTextField(formData, "content", 2000);
  const sent = await sendConversationMessage({
    conversationId,
    senderId: actor.userId,
    content,
  });
  if (!sent) redirect(`/messages/${encodeURIComponent(conversationId)}?send=unavailable`);
  revalidatePath(`/messages/${conversationId}`);
}
