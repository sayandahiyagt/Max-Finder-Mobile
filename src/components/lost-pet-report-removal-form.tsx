"use client";

import { useActionState } from "react";

import { deleteLostPet } from "@/app/lost-pets/actions";
import {
  initialLostPetReportRemovalActionState,
  type LostPetReportRemovalActionState,
} from "@/features/lost-pets/form-state";

export function LostPetReportRemovalForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<
    LostPetReportRemovalActionState,
    FormData
  >(deleteLostPet, initialLostPetReportRemovalActionState);

  return (
    <form action={formAction} className="form-card" style={{ marginTop: 16 }}>
      <input type="hidden" name="id" value={id} />
      <p className="muted">
        Remove this report from active search. Its history is retained.
      </p>
      {state.kind === "error" ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {state.message}
        </p>
      ) : null}
      <div className="form-actions">
        <button
          className="secondary-button danger-button"
          type="submit"
          disabled={pending}
        >
          {pending ? "Removing…" : "Remove report"}
        </button>
      </div>
    </form>
  );
}
