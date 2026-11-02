"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updateLostPet } from "@/app/lost-pets/actions";
import {
  initialLostPetReportUpdateActionState,
  type LostPetReportUpdateActionState,
} from "@/features/lost-pets/form-state";

export function LostPetReportUpdateForm({
  id,
  status,
  description,
}: {
  id: string;
  status: "LOST" | "FOUND";
  description: string;
}) {
  const [state, formAction, pending] = useActionState<
    LostPetReportUpdateActionState,
    FormData
  >(updateLostPet, initialLostPetReportUpdateActionState);
  const values = state.kind === "error" ? state.values : null;

  return (
    <form key={state.submission} action={formAction} className="form-card">
      <input type="hidden" name="id" value={values?.id ?? id} />
      <label className="form-field">
        Status
        <select name="status" defaultValue={values?.status ?? status}>
          <option value="LOST">Lost</option>
          <option value="FOUND">Found</option>
        </select>
      </label>
      <label className="form-field" style={{ marginTop: 17 }}>
        Description
        <textarea
          name="description"
          required
          defaultValue={values?.description ?? description}
          maxLength={2000}
        />
      </label>
      {state.kind === "error" ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {state.message} Your entries were kept.
        </p>
      ) : null}
      <div className="form-actions">
        <Link className="secondary-button" href={`/lost-pets/reports/${id}`}>
          Cancel
        </Link>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
