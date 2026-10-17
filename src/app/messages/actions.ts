"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createConversation(formData: FormData) {
  const { user } = await requireUser();
  const admin = createSupabaseAdminClient();
  const reportId = String(formData.get("reportId") ?? "").trim();
  if (!reportId) throw new Error("A lost-pet report is required.");

  const { data: report, error: reportError } = await admin
    .from("lost_pet_reports")
    .select("id, owner_id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError || !report || report.status !== "LOST") {
    throw new Error("This lost-pet report is no longer available for messaging.");
  }
  if (report.owner_id === user.id) {
    throw new Error("You cannot message yourself.");
  }

  const { data: existing, error: existingError } = await admin
    .from("conversations")
    .select("id")
    .eq("lost_pet_report_id", report.id)
    .eq("owner_id", report.owner_id)
    .eq("participant_id", user.id)
    .maybeSingle();
  if (existingError) throw new Error("Could not find the report conversation.");
  if (existing) redirect(`/messages/${existing.id}`);

  const { error: profileError } = await admin.from("profiles").upsert(
    [{ id: report.owner_id }, { id: user.id }],
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (profileError) {
    console.error("Could not prepare conversation profiles:", profileError);
    throw new Error("Could not prepare the report conversation.");
  }

  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .insert({
      report_id: report.id,
      lost_pet_report_id: report.id,
      owner_id: report.owner_id,
      participant_id: user.id,
      finder_id: user.id,
    })
    .select("id")
    .single();
  if (conversationError || !conversation) {
    console.error("Could not create report conversation:", conversationError);
    throw new Error("Could not start the report conversation.");
  }
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessage(formData: FormData) {
  const { supabase, user } = await requireUser();
  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!conversationId || !content || content.length > 2000) throw new Error("Enter a message.");
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, content, body: content });
  if (error) throw new Error("Message could not be sent.");
  revalidatePath(`/messages/${conversationId}`);
}
