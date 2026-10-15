import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { createLostPet } from "@/app/lost-pets/actions";
import { requireUser } from "@/lib/supabase/auth";
import ReportLocationFields from "@/components/report-location-fields";

const weights = ["Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs", "Over 75 lbs", "Unknown"];

export default async function NewLostPetPage() {
  await requireUser();
  return <AppShell active="Lost pets"><main className="app-main"><div className="page-heading"><div><p className="eyebrow">New report</p><h1>Report a lost pet</h1><p>Give your community the details they need to help.</p></div></div>
    <form action={createLostPet} className="form-card"><div className="form-grid">
      <label className="form-field">Pet name<input name="petName" required maxLength={100} /></label>
      <label className="form-field">Species<select name="species" required><option value="Dog">Dog</option><option value="Cat">Cat</option></select></label>
      <label className="form-field">Breed<input name="breed" required maxLength={100} /></label>
      <label className="form-field">Weight range<select name="weightRange" required>{weights.map((weight) => <option key={weight}>{weight}</option>)}</select></label>
      <ReportLocationFields />
      <label className="form-field full">Pet image<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /><span className="muted">JPEG, PNG, or WebP up to 5 MB.</span></label>
      <label className="form-field full">Description<textarea name="description" required maxLength={2000} placeholder="Coloring, collar, temperament, and anything useful to someone searching..." /></label>
    </div><div className="form-actions"><Link className="secondary-button" href="/lost-pets">Cancel</Link><button className="primary-button" type="submit">Publish report</button></div></form>
  </main></AppShell>;
}
