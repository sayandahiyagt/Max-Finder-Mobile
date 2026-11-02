import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LocalizedDateTime } from "@/components/localized-date-time";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { ProfileForm } from "@/components/profile-form";
import { getReportsForOwner } from "@/features/lost-pets/application";

export default async function ProfilePage() {
  const { identity, actor } = await requireUser();
  const profile = actor;
  const reports = await getReportsForOwner(actor.userId);
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
            <p style={{ marginTop: 8 }}>{identity.email}</p>
            <ProfileForm displayName={profile?.displayName ?? ""} />
            <Link
              className="secondary-button"
              style={{ marginTop: 16 }}
              href="/pets"
            >
              Manage Pet Profiles
            </Link>
          </section>

          <section className="content-card">
            <h2>Your reports</h2>
            <div className="table-list" style={{ marginTop: 15 }}>
              {reports.length ? (
                reports.map((report) => (
                  <div className="list-row" key={report.id}>
                    <div>
                      <h3>
                        {report.petName}{" "}
                        <span
                          className={`status-pill ${report.status === "FOUND" ? "found" : "lost"}`}
                        >
                          {report.status}
                        </span>
                      </h3>
                      <p>
                        {report.locationLabel} ·{" "}
                        <LocalizedDateTime
                          value={report.lastSeenAt}
                          dateOnly
                        />
                      </p>
                    </div>
                    <Link
                      className="secondary-button"
                      href={`/lost-pets/reports/${report.id}`}
                    >
                      Open report →
                    </Link>
                  </div>
                ))
              ) : (
                <p className="muted">You have not created a report yet.</p>
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
