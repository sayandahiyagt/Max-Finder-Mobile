import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../protected-page.module.css";

export default async function MessagesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/sign-in");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, report_id, finder_id, owner_id, updated_at")
    .order("updated_at", { ascending: false });

  const cards = await Promise.all(
    (conversations ?? []).map(async (conversation) => {
      const [{ data: report }, { data: latestMessage }] = await Promise.all([
          supabase
            .from("lost_pet_reports")
            .select("pet_id, status")
            .eq("id", conversation.report_id)
            .single(),
          supabase
            .from("messages")
            .select("body, created_at")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      let petName = "Lost pet";
      if (report?.pet_id) {
        const { data: pet } = await supabase
          .from("pets")
          .select("name")
          .eq("id", report.pet_id)
          .single();
        petName = pet?.name ?? petName;
      }
      const otherUserId =
        conversation.owner_id === authData.user.id
          ? conversation.finder_id
          : conversation.owner_id;
      const { data: participantName } = await supabase.rpc(
        "get_conversation_participant_name",
        {
          target_conversation_id: conversation.id,
          target_user_id: otherUserId,
        },
      );

      return {
        ...conversation,
        petName,
        status: report?.status ?? "UNAVAILABLE",
        latestMessage: latestMessage?.body ?? "No messages yet",
        participantName: participantName ?? "Max Finder user",
      };
    }),
  );

  return (
    <main className={styles.page}>
      <AppHeader />
      <section className={styles.content}>
        <p className={styles.eyebrow}>Messages</p>
        <h1>Your conversations</h1>
        {cards.length === 0 ? (
          <p className={styles.emptyState}>
            You do not have any conversations yet. Contact an owner from an active
            lost-pet report to start one.
          </p>
        ) : (
          <div className={styles.conversationList}>
            {cards.map((conversation) => (
              <Link
                className={styles.conversationCard}
                href={`/messages/${conversation.id}`}
                key={conversation.id}
              >
                <strong>{conversation.petName}</strong>
                <span>Conversation with {conversation.participantName}</span>
                <span>{conversation.latestMessage}</span>
                <small>{conversation.status === "LOST" ? "Active report" : "Report unavailable"}</small>
              </Link>
            ))}
          </div>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
