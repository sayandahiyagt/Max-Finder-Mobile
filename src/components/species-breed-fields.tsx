"use client";

import { useEffect, useState } from "react";

import { breedOptions, type PetSpecies } from "@/lib/breeds";

export function SpeciesBreedFields({ includeBreed = true }: { includeBreed?: boolean }) {
  const [species, setSpecies] = useState<PetSpecies>("Dog");
  return (
    <>
      <label className="form-field">Species<select id="species-select" name="species" value={species} onChange={(event) => setSpecies(event.target.value as PetSpecies)} required><option value="Dog">Dog</option><option value="Cat">Cat</option></select></label>
      {includeBreed && <label className="form-field">Breed<select name="breed" required><option value="">Select breed</option>{breedOptions[species].map((breed) => <option key={breed}>{breed}</option>)}</select></label>}
    </>
  );
}

export function OptionalBreedField() {
  const [species, setSpecies] = useState<PetSpecies>("Dog");
  useEffect(() => {
    const speciesSelect = document.querySelector<HTMLSelectElement>("#species-select");
    if (!speciesSelect) return undefined;
    const updateSpecies = () => setSpecies(speciesSelect.value as PetSpecies);
    speciesSelect.addEventListener("change", updateSpecies);
    return () => speciesSelect.removeEventListener("change", updateSpecies);
  }, []);
  return <label className="form-field">Breed<select name="breedOverride"><option value="">Not specified</option>{breedOptions[species].map((breed) => <option key={breed}>{breed}</option>)}</select></label>;
}
