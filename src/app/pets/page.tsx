import Link from "next/link";
import Image from "next/image";

import { AppShell } from "@/components/app-shell";
import { getPetProfiles } from "@/features/pets/application";
import { requireUser } from "@/lib/auth";
import { getPetImageUrls } from "@/lib/supabase/storage";

export default async function PetsPage() {
  const { actor } = await requireUser();
  const pets = await getPetProfiles(actor.userId);
  const imageUrls = await getPetImageUrls(
    pets.map((pet) => pet.profileImage?.storagePath ?? null),
  );
  const rows = pets.map((pet, index) => ({
    ...pet,
    imageUrl: imageUrls[index] ?? null,
  }));

  return (
    <AppShell active="Account">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Your pets</p>
            <h1>Pet Profiles</h1>
            <p>Manage profiles you can use in lost-pet reports.</p>
          </div>
          <Link className="primary-button" href="/pets/new">
            Add a pet
          </Link>
        </div>

        <div className="card-grid">
          {rows.length ? (
            rows.map((pet) => (
              <article className="content-card" key={pet.id}>
                {pet.imageUrl ? (
                  <Image
                    src={pet.imageUrl}
                    width={800}
                    height={600}
                    unoptimized
                    alt={pet.name}
                    style={{
                      width: "100%",
                      maxHeight: 240,
                      height: "auto",
                      objectFit: "cover",
                      borderRadius: 12,
                    }}
                  />
                ) : null}
                <h2>{pet.name}</h2>
                <p>
                  {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ""}
                </p>
                <p className="muted">
                  {pet.color} · {pet.size}
                </p>
                <Link
                  className="secondary-button"
                  href={`/pets/${pet.id}/edit`}
                >
                  Edit profile
                </Link>
              </article>
            ))
          ) : (
            <section className="content-card">
              <h2>No Pet Profiles yet</h2>
              <p>Create a profile before publishing a lost-pet report.</p>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
