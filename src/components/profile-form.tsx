"use client";

import { useActionState } from "react";

import { signOut, updateProfile, type ProfileActionState } from "@/app/profile/actions";
import styles from "./profile-form.module.css";

const initialState: ProfileActionState = {};

export function ProfileForm({
  displayName,
  phone,
}: {
  displayName: string;
  phone: string;
}) {
  const [state, action, isPending] = useActionState(updateProfile, initialState);

  return (
    <>
      <form className={styles.form} action={action}>
        <label htmlFor="displayName">Display name</label>
        <input id="displayName" name="displayName" defaultValue={displayName} required />
        <label htmlFor="phone">Phone number <span>(optional)</span></label>
        <input id="phone" name="phone" type="tel" defaultValue={phone} />
        {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        {state.success && <p className={styles.success} role="status">{state.success}</p>}
        <button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
      <form action={signOut}>
        <button className={styles.logout} type="submit">Log out</button>
      </form>
    </>
  );
}
