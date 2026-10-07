"use client";

import { useActionState } from "react";

import { updateLostPetReport, type ReportActionState } from "@/app/lost-pets/actions";
import styles from "./profile-form.module.css";
import { LocationPicker } from "./location-picker";

type ReportValues = {
  id: string;
  last_seen_at: string;
  last_seen_location: string;
  latitude: number;
  longitude: number;
  contact_method: string;
};

export function ReportEditForm({
  report,
  phone,
}: {
  report: ReportValues;
  phone?: string;
}) {
  const [state, action, pending] = useActionState<ReportActionState, FormData>(
    updateLostPetReport,
    {},
  );
  const dateValue = new Date(report.last_seen_at).toISOString().slice(0, 16);

  return (
    <form className={styles.form} action={action}>
      <input type="hidden" name="reportId" value={report.id} />
      <label htmlFor="lastSeenAt">Last seen time</label>
      <input id="lastSeenAt" name="lastSeenAt" type="datetime-local" defaultValue={dateValue} required />
      <LocationPicker
        initialCoordinates={
          Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
            ? { latitude: report.latitude, longitude: report.longitude }
            : undefined
        }
        initialAddress={report.last_seen_location}
      />
      <label htmlFor="contactMethod">Preferred contact method</label>
      <select id="contactMethod" name="contactMethod" defaultValue={report.contact_method} required>
        <option value="email">Email</option>
        {phone && <option value="phone">Phone</option>}
      </select>
      {state.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save report changes"}
      </button>
    </form>
  );
}
