import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/supabase/auth";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  // Load the user's profile and reports at the same time.
  const [profileResult, reportsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("lost_pet_reports")
      .select("id, pet_name, status, last_seen_at, location_label")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const displayName = profileResult.data?.display_name ?? "";
  const reports = reportsResult.data;

  return (
    <AppShell active="Account">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Your account</p>
            <h1>Profile</h1>
            <p>Manage your public name and lost-pet reports.</p>
          </div>

          <form action={signOut}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <div className="detail-layout">
          <section className="content-card">
            <h2>Account details</h2>
            <p style={{ marginTop: 8 }}>{user.email}</p>

            <ProfileForm displayName={displayName} />
          </section>

          <section className="content-card">
            <h2>Your reports</h2>

            <div className="table-list" style={{ marginTop: 15 }}>
              {reports?.length ? (
                reports.map((report) => {
                  const statusClass =
                    report.status === "FOUND" ? "found" : "lost";

                  const lastSeenDate = new Date(
                    report.last_seen_at,
                  ).toLocaleDateString();

                  return (
                    <div className="list-row" key={report.id}>
                      <div>
                        <h3>
                          {report.pet_name}{" "}
                          <span
                            className={`status-pill ${statusClass}`}
                          >
                            {report.status}
                          </span>
                        </h3>

                        <p>
                          {report.location_label} · {lastSeenDate}
                        </p>
                      </div>

                      <Link
                        className="secondary-button"
                        href={`/lost-pets/reports/${report.id}`}
                      >
                        Open report →
                      </Link>
                    </div>
                  );
                })
              ) : (
                <p className="muted">
                  You have not created a report yet.
                </p>
              )}
            </div>

            <Link
              className="primary-button"
              style={{ marginTop: 17 }}
              href="/lost-pets/new"
            >
              Create report
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
