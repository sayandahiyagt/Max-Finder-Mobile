import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { Chat } from "@/components/chat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../protected-page.module.css";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, report_id, finder_id, owner_id")
    .eq("id", id)
    .single();
  if (!conversation) notFound();

  const { data: report } = await supabase
    .from("lost_pet_reports")
    .select("pet_id, status")
    .eq("id", conversation.report_id)
    .single();
  const { data: pet } = report
    ? await supabase.from("pets").select("name").eq("id", report.pet_id).single()
    : { data: null };
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <BackButton />
        <p className={styles.eyebrow}>Conversation</p>
        <h1>{pet?.name ?? "Lost pet"}</h1>
        <p className={styles.pageIntro}>
          {report?.status === "LOST"
            ? "Messages are connected to this active lost-pet report."
            : "This report is no longer active. You can read the conversation history."}
        </p>
        <Chat
          conversationId={id}
          currentUserId={authData.user.id}
          initialMessages={messages ?? []}
          canSend={report?.status === "LOST"}
        />
      </section>
      <BottomNav />
    </main>
  );
}
