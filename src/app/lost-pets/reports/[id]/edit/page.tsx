import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LostPetReportRemovalForm } from "@/components/lost-pet-report-removal-form";
import { LostPetReportUpdateForm } from "@/components/lost-pet-report-update-form";
import { getOwnedReport } from "@/features/lost-pets/application";
import { requireUser } from "@/lib/auth";

export default async function EditLostPetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { actor } = await requireUser();
  const report = await getOwnedReport(id, actor.userId);
  if (!report) notFound();
  if (
    report.status !== "LOST" &&
    report.status !== "FOUND" &&
    report.status !== "REMOVED"
  ) {
    notFound();
  }

  return (
    <AppShell active="Lost pets">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Manage report</p>
            <h1>Update {report.petName ?? "report"}</h1>
            <p>Keep the community informed as the search changes.</p>
          </div>
        </div>
        {report.status === "REMOVED" ? (
          <p className="content-card">
            This report was removed from active search.
          </p>
        ) : (
          <>
            <LostPetReportUpdateForm
              id={id}
              status={report.status}
              description={report.description ?? ""}
            />
            <LostPetReportRemovalForm id={id} />
          </>
        )}
      </main>
    </AppShell>
  );
}
