import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PetProfileForm } from "@/components/pet-profile-form";
import { PetProfileDeleteForm } from "@/components/pet-profile-delete-form";
import { updatePet } from "@/app/pets/actions";
import { getPetProfile } from "@/features/pets/application";
import { requireUser } from "@/lib/auth";
import { getPetImageUrl } from "@/lib/supabase/storage";

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { actor } = await requireUser();
  const { id } = await params;
  const pet = await getPetProfile(id, actor.userId);
  if (!pet) notFound();
  const imageUrl = await getPetImageUrl(pet.profileImage?.storagePath ?? null);

  return (
    <AppShell active="Account">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Pet Profile</p>
            <h1>Edit {pet.name}</h1>
          </div>
          <Link className="secondary-button" href="/pets">
            All Pet Profiles
          </Link>
        </div>

        <PetProfileForm
          action={updatePet}
          pet={pet}
          imageUrl={imageUrl}
          editing={true}
          petId={pet.id}
          submitLabel="Save changes"
        />

        <PetProfileDeleteForm petId={pet.id} />
      </main>
    </AppShell>
  );
}
