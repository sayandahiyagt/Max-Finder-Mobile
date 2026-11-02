import Image from "next/image";

import type { PetProfileFormValues } from "@/features/pets/form-state";
import type { PetProfileInput } from "@/features/pets/types";

type PetFormValues = Omit<PetProfileInput, "species" | "size"> & {
  species: string;
  size: string;
};

export type PetProfileFieldPet = PetFormValues;

export function PetProfileFields({
  pet,
  imageUrl,
  editing,
  values,
}: {
  pet: PetFormValues | null;
  imageUrl: string | null;
  editing: boolean;
  values?: PetProfileFormValues | null;
}) {
  return (
    <div className="form-grid">
      <label className="form-field">
        Name
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={values?.name ?? pet?.name ?? ""}
        />
      </label>
      <label className="form-field">
        Species
        <select
          name="species"
          required
          defaultValue={values?.species ?? pet?.species ?? "dog"}
        >
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
        </select>
      </label>
      <label className="form-field">
        Breed
        <input
          name="breed"
          maxLength={100}
          defaultValue={values?.breed ?? pet?.breed ?? ""}
        />
      </label>
      <label className="form-field">
        Color
        <input
          name="color"
          required
          maxLength={50}
          defaultValue={values?.color ?? pet?.color ?? ""}
        />
      </label>
      <label className="form-field">
        Size
        <select
          name="size"
          required
          defaultValue={values?.size ?? pet?.size ?? "small"}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label className="form-field">
        Age in years
        <input
          name="age"
          type="number"
          min="0"
          max="200"
          required
          defaultValue={values?.age ?? pet?.age}
        />
      </label>
      <label className="form-field">
        Date of birth
        <input
          name="dateOfBirth"
          type="date"
          defaultValue={
            values?.dateOfBirth ??
            pet?.dateOfBirth?.toISOString().slice(0, 10) ??
            ""
          }
        />
      </label>
      <label className="form-field full">
        Description
        <textarea
          name="description"
          maxLength={2000}
          defaultValue={values?.description ?? pet?.description ?? ""}
        />
      </label>
      {imageUrl ? (
        <div className="form-field full">
          <Image
            src={imageUrl}
            width={800}
            height={600}
            unoptimized
            alt={`${pet?.name ?? "Pet"} profile`}
            style={{
              width: "100%",
              maxWidth: 400,
              height: "auto",
              borderRadius: 12,
            }}
          />
          <label>
            <input type="checkbox" name="removeImage" /> Remove profile image
          </label>
        </div>
      ) : null}
      <label className="form-field full">
        {editing ? "Replace profile image" : "Profile image"}
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
        <span className="muted">Optional. JPEG, PNG, or WebP up to 15 MB.</span>
      </label>
    </div>
  );
}
