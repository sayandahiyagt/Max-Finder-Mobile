"use client";

import { useActionState } from "react";
import { useState } from "react";

import { PET_BREEDS, PET_SIZES } from "@/lib/pets";
import { savePet, type PetActionState } from "@/app/profile/pets/actions";
import styles from "./profile-form.module.css";

type PetFormValues = {
  id?: string;
  name?: string;
  species?: string;
  breed?: string;
  color?: string;
  size?: string;
  age?: number;
  imageUrl?: string | null;
};

export function PetForm({ pet }: { pet?: PetFormValues }) {
  const [species, setSpecies] = useState(pet?.species ?? "");
  const [state, action, isPending] = useActionState<PetActionState, FormData>(
    savePet,
    {},
  );

  return (
    <form className={styles.form} action={action}>
      {pet?.id && <input type="hidden" name="petId" value={pet.id} />}
      <label htmlFor="name">Pet name</label>
      <input id="name" name="name" defaultValue={pet?.name} required maxLength={80} />
      <label htmlFor="species">Species</label>
      <select id="species" name="species" required value={species} onChange={(event) => setSpecies(event.target.value)}>
        <option value="" disabled>Select species</option>
        <option value="dog">Dog</option>
        <option value="cat">Cat</option>
      </select>
      <label htmlFor="breed">Breed</label>
      <select id="breed" name="breed" required defaultValue={pet?.breed ?? ""}>
        <option value="" disabled>Select a common breed</option>
        {species && <optgroup label={species === "dog" ? "Dogs" : "Cats"}>
          {PET_BREEDS[species as "dog" | "cat"].map((breed) => <option key={breed}>{breed}</option>)}
        </optgroup>}
      </select>
      <label htmlFor="color">Color</label>
      <input id="color" name="color" defaultValue={pet?.color} required maxLength={80} />
      <label htmlFor="size">Size</label>
      <select id="size" name="size" required defaultValue={pet?.size ?? ""}>
        <option value="" disabled>Select size</option>
        {PET_SIZES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor="age">Age (years)</label>
      <input id="age" name="age" type="number" min="0" max="200" step="1" defaultValue={pet?.age} required />
      {pet?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.petFormImage} src={pet.imageUrl} alt="" />
      )}
      <label htmlFor="image">Pet image</label>
      <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!pet} />
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : pet ? "Save changes" : "Save pet profile"}
      </button>
    </form>
  );
}
