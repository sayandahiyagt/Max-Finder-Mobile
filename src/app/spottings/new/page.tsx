import { AppShell } from "@/components/app-shell";
import { SpottingForm } from "@/components/spotting-form";

export default function NewSpottingPage() {
  return (
    <AppShell active="Spottings">
      <main className="app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Anonymous contribution</p>
            <h1>Report a spotting</h1>
            <p>
              Share what you saw without creating a public profile or leaving
              contact information.
            </p>
          </div>
        </div>
        <SpottingForm />
      </main>
    </AppShell>
  );
}
