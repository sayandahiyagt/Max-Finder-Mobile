"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  PetProfileFields,
  type PetProfileFieldPet,
} from "@/components/pet-profile-fields";
import type {
  PetProfileAction,
  PetProfileActionState,
} from "@/features/pets/form-state";
import { initialPetProfileActionState } from "@/features/pets/form-state";

export function PetProfileForm({
  action,
  pet,
  imageUrl,
  editing,
  petId,
  cancelHref,
  submitLabel,
}: {
  action: PetProfileAction;
  pet: PetProfileFieldPet | null;
  imageUrl: string | null;
  editing: boolean;
  petId?: string;
  cancelHref?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    PetProfileActionState,
    FormData
  >(action, initialPetProfileActionState);

  return (
    <form
      key={state.submission}
      action={formAction}
      className="form-card"
    >
      {petId ? <input type="hidden" name="petId" value={petId} /> : null}
      <PetProfileFields
        pet={pet}
        imageUrl={imageUrl}
        editing={editing}
        values={state.kind === "error" ? state.values : null}
      />
      {state.kind === "error" ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {state.message} Your text entries were kept. Reselect an image or
          repeat image removal if needed.
        </p>
      ) : null}
      <div className="form-actions">
        {cancelHref ? (
          <Link className="secondary-button" href={cancelHref}>
            Cancel
          </Link>
        ) : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
