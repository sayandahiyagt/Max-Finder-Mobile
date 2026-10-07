"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MessageActionState = { error?: string };

export async function markConversationRead(conversationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user || !conversationId) return;

  await supabase.rpc("mark_conversation_messages_read", {
    target_conversation_id: conversationId,
  });
}

export async function startConversation(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("id, owner_id, status")
    .eq("id", reportId)
    .eq("status", "LOST")
    .single();

  if (!report || report.owner_id === authData.user.id) {
    redirect("/lost-pets/search");
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .upsert(
      {
        report_id: report.id,
        finder_id: authData.user.id,
        owner_id: report.owner_id,
      },
      { onConflict: "report_id,finder_id" },
    )
    .select("id")
    .single();

  if (error || !conversation) {
    throw new Error("The conversation could not be started.");
  }

  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(
  _previousState: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  if (!conversationId || !body || body.length > 2000) {
    return { error: "Enter a message of 1 to 2,000 characters." };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .single();
  if (!conversation) return { error: "Conversation not found." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: authData.user.id,
    body,
  });
  if (error) return { error: "The message could not be sent." };

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return {};
}
