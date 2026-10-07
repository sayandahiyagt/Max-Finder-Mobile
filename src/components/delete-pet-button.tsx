"use client";

import { FormEvent } from "react";

import { deletePet } from "@/app/profile/pets/actions";
import styles from "./delete-pet-button.module.css";

export function DeletePetButton({ petId }: { petId: string }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Delete this pet profile? This cannot be undone.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={deletePet} onSubmit={confirmDelete}>
      <input type="hidden" name="petId" value={petId} />
      <button className={styles.button} type="submit">Delete pet profile</button>
    </form>
  );
}
