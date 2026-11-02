"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createSpotting } from "@/app/spottings/actions";
import { LocationDateFields } from "@/components/location-date-fields";
import { SpottingPetDetails } from "@/components/spotting-pet-details";
import {
  initialSpottingActionState,
  type SpottingActionState,
} from "@/features/spottings/form-state";

export function SpottingForm() {
  const [state, formAction, pending] = useActionState<
    SpottingActionState,
    FormData
  >(createSpotting, initialSpottingActionState);
  const values = state.kind === "error" ? state.values : null;

  return (
    <form key={state.submission} action={formAction} className="form-card">
      <div className="form-grid">
        <SpottingPetDetails {...(values ? { values } : {})} />
        <LocationDateFields
          {...(values
            ? {
                initialValues: {
                  dateTime: values.spottedAt,
                  timezoneOffset: values.spottedAtTimezoneOffset,
                  locationLabel: values.locationLabel,
                  latitude: values.latitude,
                  longitude: values.longitude,
                },
              }
            : {})}
        />
        <label className="form-field full">
          Image from your device
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
          <span className="muted">JPEG, PNG, or WebP up to 15 MB.</span>
        </label>
      </div>
      <div className="notice" style={{ marginTop: 22 }}>
        This spotting is anonymous and publishes immediately after validation.
      </div>
      {state.kind === "error" ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {state.message} Your details and selected location were kept. Select
          the image again to resubmit.
        </p>
      ) : null}
      <div className="form-actions">
        <Link className="secondary-button" href="/">
          Cancel
        </Link>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish spotting"}
        </button>
      </div>
    </form>
  );
}
