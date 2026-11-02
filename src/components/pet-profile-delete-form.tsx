"use client";

import { useActionState } from "react";

import { deletePet } from "@/app/pets/actions";
import {
  initialPetProfileDeleteActionState,
  type PetProfileDeleteActionState,
} from "@/features/pets/form-state";

export function PetProfileDeleteForm({ petId }: { petId: string }) {
  const [state, formAction, pending] = useActionState<
    PetProfileDeleteActionState,
    FormData
  >(deletePet, initialPetProfileDeleteActionState);

  return (
    <form action={formAction} style={{ marginTop: 16 }}>
      <input type="hidden" name="petId" value={petId} />
      <button className="secondary-button" type="submit" disabled={pending}>
        {pending ? "Deleting…" : "Delete Pet Profile"}
      </button>
      <p className="muted">
        Profiles used by a Lost Pet Report cannot be deleted.
      </p>
      {state.kind === "error" ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
