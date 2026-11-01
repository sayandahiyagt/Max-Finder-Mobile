import { AppShell } from "@/components/app-shell";
import { PetProfileForm } from "@/components/pet-profile-form";
import { createPet } from "@/app/pets/actions";
import { requireUser } from "@/lib/auth";

export default async function NewPetPage() {
  await requireUser();
  return (
    <AppShell active="Account">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Pet Profile</p>
            <h1>Add a pet</h1>
          </div>
        </div>
        <PetProfileForm
          action={createPet}
          pet={null}
          imageUrl={null}
          editing={false}
          cancelHref="/pets"
          submitLabel="Create Pet Profile"
        />
      </main>
    </AppShell>
  );
}
