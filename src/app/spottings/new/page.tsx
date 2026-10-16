import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { createSpotting } from "@/app/spottings/actions";
import SpottingAdditionalInfo from "@/components/spotting-additional-info";
import { SpeciesBreedFields } from "@/components/species-breed-fields";

export default function NewSpottingPage() {
  return <AppShell active="Spottings"><main className="app-main"><div className="page-heading"><div><p className="eyebrow">Anonymous contribution</p><h1>Report a spotting</h1><p>Share what you saw without creating a public profile or leaving contact information.</p></div></div>
    <form action={createSpotting} className="form-card"><div className="form-grid">
      <SpeciesBreedFields />
      <label className="form-field full">Image from your device<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /><span className="muted">JPEG, PNG, or WebP up to 15 MB.</span></label>
      <SpottingAdditionalInfo />
    </div><div className="notice" style={{ marginTop: 22 }}>This spotting is anonymous and publishes immediately after validation.</div><div className="form-actions"><Link className="secondary-button" href="/">Cancel</Link><button className="primary-button" type="submit">Publish spotting</button></div></form>
  </main></AppShell>;
}
