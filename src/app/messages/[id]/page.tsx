import { notFound } from "next/navigation";

import { sendMessage } from "@/app/messages/actions";
import { AppShell } from "@/components/app-shell";
import { getConversationThread } from "@/features/communication/application";
import { requireUser } from "@/lib/auth";

export default async function MessageThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ send?: string }>;
}) {
  const { id } = await params;
  const { send } = await searchParams;
  const { actor } = await requireUser();
  const conversation = await getConversationThread({
    conversationId: id,
    userId: actor.userId,
  });
  if (!conversation) notFound();

  return (
    <AppShell active="Messages">
      <main className="app-main">
        <div className="message-layout">
          <section className="thread">
            <div className="thread-header">
              <strong>
                {conversation.report.petName ?? "Lost pet"} · with{" "}
                {conversation.otherDisplayName}
              </strong>
              <span className="muted">
                {conversation.report.species} · {conversation.report.breed} ·
                Last seen near {conversation.report.locationLabel}
              </span>
            </div>
            <div className="thread-messages">
              {conversation.messages.length ? (
                conversation.messages.map((message) => (
                  <div
                    className={`bubble ${message.senderId === actor.userId ? "sent" : "received"}`}
                    key={message.id}
                  >
                    {message.text}
                  </div>
                ))
              ) : (
                <p className="muted">
                  Start the conversation with a helpful, respectful message.
                </p>
              )}
            </div>
            {send === "unavailable" && conversation.report.status === "LOST" && (
              <p role="status">Message could not be sent. Please try again.</p>
            )}
            {conversation.report.status === "LOST" ? (
              <form action={sendMessage} className="message-form">
                <input type="hidden" name="conversationId" value={id} />
                <input
                  name="content"
                  required
                  maxLength={2000}
                  placeholder="Write a message…"
                />
                <button type="submit">Send</button>
              </form>
            ) : (
              <p role="status">
                This report is resolved. This conversation is read-only.
              </p>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
