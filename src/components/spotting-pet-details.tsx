"use client";

import { useState } from "react";

import {
  breedOptions,
  isPetSpecies,
  type PetSpecies,
  weightRanges,
} from "@/lib/pet-options";

export function SpottingPetDetails({
  values,
}: {
  values?: {
    species: string;
    breed: string;
    weightRange: string;
    description: string;
    distinguishingCharacteristics: string;
  };
}) {
  const initialSpecies = isPetSpecies(values?.species)
    ? values.species
    : "Dog";
  const [species, setSpecies] = useState<PetSpecies>(initialSpecies);

  return (
    <>
      <label className="form-field">
        Species
        <select
          name="species"
          value={species}
          onChange={(event) => {
            if (isPetSpecies(event.target.value))
              setSpecies(event.target.value);
          }}
          required
        >
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
        </select>
      </label>
      <details className="additional-info" open={Boolean(values)}>
        <summary>
          Add additional information <span>Optional</span>
        </summary>
        <div className="form-grid additional-info-content">
          <label className="form-field">
            Breed
            <select name="breed" defaultValue={values?.breed ?? ""}>
              <option value="">Not specified</option>
              {breedOptions[species].map((breed) => (
                <option key={breed}>{breed}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Estimated weight
            <select name="weightRange" defaultValue={values?.weightRange ?? ""}>
              <option value="">Not sure</option>
              {weightRanges.map((weight) => (
                <option key={weight}>{weight}</option>
              ))}
            </select>
          </label>
          <label className="form-field full">
            Description
            <textarea
              name="description"
              maxLength={2000}
              placeholder="What did you notice?"
              defaultValue={values?.description ?? ""}
            />
          </label>
          <label className="form-field full">
            Distinguishing characteristics
            <textarea
              name="distinguishingCharacteristics"
              maxLength={2000}
              placeholder="Collar, markings, behavior, or direction of travel"
              defaultValue={values?.distinguishingCharacteristics ?? ""}
            />
          </label>
        </div>
      </details>
    </>
  );
}
