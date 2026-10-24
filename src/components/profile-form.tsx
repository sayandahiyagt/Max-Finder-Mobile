"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileActionState } from "@/app/profile/actions";

const initialProfileActionState = {
  kind: "idle",
  message: "",
} satisfies ProfileActionState;

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialProfileActionState,
  );

  return (
    <form action={formAction} className="auth-form">
      <label>
        Display name
        <input
          name="displayName"
          defaultValue={displayName}
          required
          maxLength={100}
        />
      </label>
      {state.message && (
        <p
          className={state.kind === "success" ? "notice" : "auth-error"}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
