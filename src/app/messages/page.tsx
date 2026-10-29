import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/supabase/auth";

export default async function MessagesPage() {
  const { supabase, user } = await requireUser();

  // Load the user's conversations, newest activity first.
  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "id, lost_pet_report_id, report_id, owner_id, participant_id, updated_at",
    )
    .or(`owner_id.eq.${user.id},participant_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  // Collect the report and participant IDs needed for the conversation list.
  const reportIds = [
    ...new Set(
      (conversations ?? [])
        .map(
          (conversation) =>
            conversation.lost_pet_report_id ?? conversation.report_id,
        )
        .filter(Boolean),
    ),
  ];

  const otherUserIds = [
    ...new Set(
      (conversations ?? [])
        .map((conversation) =>
          conversation.owner_id === user.id
            ? conversation.participant_id
            : conversation.owner_id,
        )
        .filter(Boolean),
    ),
  ];

  // Fetch related reports and profiles only when IDs are available.
  const { data: reports } = reportIds.length
    ? await supabase
        .from("lost_pet_reports")
        .select("id, pet_name, species, breed")
        .in("id", reportIds)
    : { data: [] };

  const { data: profiles } = otherUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", otherUserIds)
    : { data: [] };

  // Make related records easy to look up when rendering each conversation.
  const reportsById = new Map(
    (reports ?? []).map((report) => [report.id, report]),
  );

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

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

        {conversations?.length ? (
          <div className="table-list">
            {conversations.map((conversation) => {
              const reportId =
                conversation.lost_pet_report_id ?? conversation.report_id;

              const report = reportId
                ? reportsById.get(reportId)
                : null;

              const otherUserId =
                conversation.owner_id === user.id
                  ? conversation.participant_id
                  : conversation.owner_id;

              const otherProfile = otherUserId
                ? profilesById.get(otherUserId)
                : null;

              const petName = report?.pet_name ?? "Lost pet";
              const displayName =
                otherProfile?.display_name || "MaxFinder user";

              const petDetails = report
                ? `${report.species} · ${report.breed}`
                : "Pet details unavailable";

              const updatedAt = new Date(
                conversation.updated_at,
              ).toLocaleString();

              return (
                <Link
                  className="list-row"
                  href={`/messages/${conversation.id}`}
                  key={conversation.id}
                >
                  <div className="list-row-main">
                    <div className="app-avatar">🐾</div>

                    <div>
                      <h3>
                        {petName} · with {displayName}
                      </h3>
                      <p>
                        {petDetails} · Updated {updatedAt}
                      </p>
                    </div>
                  </div>

                  <span style={{ color: "#167755", fontWeight: 700 }}>
                    Open →
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            No conversations yet. Open an active lost-pet report to contact
            its owner.
          </div>
        )}
      </main>
    </AppShell>
  );
}
