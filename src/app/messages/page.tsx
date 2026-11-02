import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LocalizedDateTime } from "@/components/localized-date-time";
import { getConversationsForUser } from "@/features/communication/application";
import { requireUser } from "@/lib/auth";

export default async function MessagesPage() {
  const { actor } = await requireUser();
  const conversations = await getConversationsForUser(actor.userId);

  return (
    <AppShell active="Messages">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Private communication</p>
            <h1>Messages</h1>
            <p>
              Conversations about active lost-pet reports stay between
              participants.
            </p>
          </div>
        </div>
        {conversations.length ? (
          <div className="table-list">
            {conversations.map((conversation) => (
              <Link
                className="list-row"
                href={`/messages/${conversation.id}`}
                key={conversation.id}
              >
                <div className="list-row-main">
                  <div className="app-avatar">🐾</div>
                  <div>
                    <h3>
                      {conversation.report.petName ?? "Lost pet"} · with{" "}
                      {conversation.otherDisplayName}
                    </h3>
                    <p>
                      {conversation.report.species} ·{" "}
                      {conversation.report.breed} · Updated{" "}
                      <LocalizedDateTime value={conversation.updatedAt} />
                    </p>
                  </div>
                </div>
                <span style={{ color: "#167755", fontWeight: 700 }}>
                  Open →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No conversations yet. Open an active lost-pet report to contact its
            owner.
          </div>
        )}
      </main>
    </AppShell>
  );
}
