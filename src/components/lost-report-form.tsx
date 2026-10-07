"use client";

import { useActionState, useState } from "react";

import { PET_BREEDS, PET_SIZES } from "@/lib/pets";
import { createLostPetReport, type ReportActionState } from "@/app/lost-pets/actions";
import styles from "./profile-form.module.css";
import { LocationPicker } from "./location-picker";

type PetOption = { id: string; name: string; species: string };

export function LostReportForm({
  pets,
  phone,
  initialPetId = "",
}: {
  pets: PetOption[];
  phone?: string;
  initialPetId?: string;
}) {
  const [selectedPet, setSelectedPet] = useState(initialPetId);
  const [species, setSpecies] = useState("");
  const [state, action, pending] = useActionState<ReportActionState, FormData>(
    createLostPetReport, {},
  );

  return (
    <form className={styles.form} action={action}>
      <label htmlFor="petId">Pet profile</label>
      <select id="petId" name="petId" value={selectedPet} onChange={(e) => setSelectedPet(e.target.value)}>
        <option value="">Create a new pet profile</option>
        {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
      </select>
      {!selectedPet && (
        <>
          <label htmlFor="petName">Pet name</label><input id="petName" name="petName" required />
          <label htmlFor="petSpecies">Species</label>
          <select id="petSpecies" name="petSpecies" value={species} onChange={(e) => setSpecies(e.target.value)} required>
            <option value="" disabled>Select species</option><option value="dog">Dog</option><option value="cat">Cat</option>
          </select>
          <label htmlFor="petBreed">Breed</label>
          <select id="petBreed" name="petBreed" required defaultValue="">
            <option value="" disabled>Select breed</option>
            {species && PET_BREEDS[species as "dog" | "cat"].map((breed) => <option key={breed}>{breed}</option>)}
          </select>
          <label htmlFor="petColor">Color</label><input id="petColor" name="petColor" required />
          <label htmlFor="petSize">Size</label>
          <select id="petSize" name="petSize" required defaultValue="">
            <option value="" disabled>Select size</option>
            {PET_SIZES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label htmlFor="petAge">Age (years)</label><input id="petAge" name="petAge" type="number" min="0" max="200" required />
          <label htmlFor="petImage">Pet image</label><input id="petImage" name="petImage" type="file" accept="image/jpeg,image/png,image/webp" required />
        </>
      )}
      <label htmlFor="lastSeenAt">Last seen time</label>
      <input id="lastSeenAt" name="lastSeenAt" type="datetime-local" required />
      <LocationPicker />
      <label htmlFor="contactMethod">Preferred contact method</label>
      <select id="contactMethod" name="contactMethod" required defaultValue="email">
        <option value="email">Email</option>
        {phone && <option value="phone">Phone</option>}
      </select>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Creating report..." : "Create lost pet report"}</button>
    </form>
  );
}
