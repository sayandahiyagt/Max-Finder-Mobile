import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LostPetReportForm } from "@/components/lost-pet-report-form";
import { getPetProfiles } from "@/features/pets/application";
import { requireUser } from "@/lib/auth";

export default async function NewLostPetPage() {
  const { actor } = await requireUser();
  const pets = await getPetProfiles(actor.userId);

  return (
    <AppShell active="Lost pets">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">New report</p>
            <h1>Report a lost pet</h1>
            <p>Give your community the details they need to help.</p>
          </div>
        </div>
        <LostPetReportForm pets={pets} />
        {!pets.length ? (
          <p className="muted">
            No Pet Profiles found. <Link href="/pets/new">Create one now.</Link>
          </p>
        ) : null}
      </main>
    </AppShell>
  );
}
