"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const OptionalLocationFields = dynamic(
  () => import("@/components/location-picker").then((module) => {
    return function OptionalFields() {
      return (
        <>
          <module.CurrentDateTimeInput name="spottedAtOverride" label="Date and time spotted" />
          <div className="form-field full">
            <module.LocationPickerFields
              locationName="locationLabelOverride"
              latitudeName="latitudeOverride"
              longitudeName="longitudeOverride"
            />
          </div>
        </>
      );
    };
  }),
  { ssr: false },
);

export default function SpottingAdditionalInfo() {
  const [defaults, setDefaults] = useState({
    latitude: "40.7128",
    longitude: "-74.006",
    spottedAt: (() => {
      const now = new Date();
      const timezoneOffset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
    })(),
  });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setDefaults((current) => ({
        ...current,
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
      }));
    });
  }, []);

  return (
    <>
      <input name="latitude" type="hidden" value={defaults.latitude} readOnly />
      <input name="longitude" type="hidden" value={defaults.longitude} readOnly />
      <input name="spottedAt" type="hidden" value={defaults.spottedAt} readOnly />
      <input name="locationLabel" type="hidden" value="Current location" readOnly />
      <details className="additional-info">
        <summary>Add additional information <span>Optional</span></summary>
        <div className="form-grid additional-info-content">
          <OptionalLocationFields />
          <label className="form-field">Breed<input name="breedOverride" maxLength={100} /></label>
          <label className="form-field">Estimated weight<select name="weightRangeOverride"><option value="">Not sure</option><option>Under 10 lbs</option><option>10–25 lbs</option><option>26–50 lbs</option><option>51–75 lbs</option><option>Over 75 lbs</option><option>Unknown</option></select></label>
          <label className="form-field full">Description<textarea name="descriptionOverride" maxLength={2000} placeholder="What did you notice?" /></label>
          <label className="form-field full">Distinguishing characteristics<textarea name="distinguishingCharacteristicsOverride" maxLength={2000} placeholder="Collar, markings, behavior, or direction of travel" /></label>
        </div>
      </details>
    </>
  );
}
