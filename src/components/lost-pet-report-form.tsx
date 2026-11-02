"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createLostPetReport } from "@/app/lost-pets/actions";
import { LocationDateFields } from "@/components/location-date-fields";
import {
  initialLostPetReportActionState,
  type LostPetReportActionState,
} from "@/features/lost-pets/form-state";
import { weightRanges } from "@/lib/pet-options";

type PetOption = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
};

export function LostPetReportForm({ pets }: { pets: PetOption[] }) {
  const [state, formAction, pending] = useActionState<
    LostPetReportActionState,
    FormData
  >(createLostPetReport, initialLostPetReportActionState);
  const values = state.kind === "error" ? state.values : null;

  return (
    <form key={state.submission} action={formAction} className="form-card">
      <div className="form-grid">
        {pets.length ? (
          <label className="form-field">
            Pet Profile
            <select
              name="petId"
              required
              defaultValue={values?.petId ?? pets[0]?.id}
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} · {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="form-field full">
            Create a Pet Profile before publishing a report.{" "}
            <Link href="/pets/new">Add a pet</Link>
          </div>
        )}
        <label className="form-field">
          Weight range
          <select
            name="weightRange"
            required
            defaultValue={values?.weightRange ?? weightRanges[0]}
          >
            {weightRanges.map((weight) => (
              <option key={weight}>{weight}</option>
            ))}
          </select>
        </label>
        <LocationDateFields
          dateName="lastSeenAt"
          dateLabel="Last seen date and time"
          {...(values
            ? {
                initialValues: {
                  dateTime: values.lastSeenAt,
                  timezoneOffset: values.lastSeenAtTimezoneOffset,
                  locationLabel: values.locationLabel,
                  latitude: values.latitude,
                  longitude: values.longitude,
                },
              }
            : {})}
        />
        <label className="form-field">
          Contact method
          <select
            name="contactMethod"
            required
            defaultValue={values?.contactMethod || "in_app"}
          >
            <option value="in_app">In-app messages</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </label>
        <label className="form-field">
          Contact value
          <input
            name="contactValue"
            maxLength={255}
            placeholder="Required for email or phone"
            defaultValue={values?.contactValue}
          />
        </label>
        <label className="form-field full">
          Contact instructions
          <textarea
            name="contactInstructions"
            maxLength={2000}
            defaultValue={values?.contactInstructions}
          />
        </label>
        <label className="form-field full">
          Description
          <textarea
            name="description"
            required
            maxLength={2000}
            placeholder="Coloring, collar, temperament, and anything useful to someone searching..."
            defaultValue={values?.description}
          />
        </label>
      </div>
      {state.kind === "error" ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {state.message} Your entries and selected location were kept.
        </p>
      ) : null}
      <div className="form-actions">
        <Link className="secondary-button" href="/">
          Cancel
        </Link>
        <button
          className="primary-button"
          type="submit"
          disabled={!pets.length || pending}
        >
          {pending ? "Publishing…" : "Publish report"}
        </button>
      </div>
    </form>
  );
}
