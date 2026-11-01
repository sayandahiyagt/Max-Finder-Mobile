import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { PawPrint, Plus, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  CommunityStats,
  CommunityStatsLoading,
} from "@/components/community-stats";
import { CommunityMapExplorer } from "@/components/community-map-explorer";
import { ReunionsCarousel } from "@/components/reunions-carousel";
import { getCommunityActivityCounts } from "@/features/search/application";
import styles from "./page.module.css";

async function CommunityStatsSection() {
  await connection();
  const stats = await getCommunityActivityCounts().catch(() => null);
  return <CommunityStats stats={stats} />;
}

export default function Home() {
  return (
    <AppShell active="Explore">
      <main className={styles.shell}>
        <section className={styles.hero} id="explore">
          <div>
            <p className={styles.eyebrow}>
              <ShieldCheck size={15} /> Community-powered pet recovery
            </p>
            <h1>Find lost pets in your area</h1>
            <p className={styles.heroCopy}>
              Explore nearby reports, share what you see, and help bring every
              pet home safely.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/spottings/new">
              <Plus size={18} /> Report spotting
            </Link>
            <Link className={styles.primaryAction} href="/lost-pets/new">
              <PawPrint size={18} /> Report lost pet
            </Link>
          </div>
        </section>

        <Suspense fallback={<CommunityStatsLoading />}>
          <CommunityStatsSection />
        </Suspense>

        <CommunityMapExplorer />
        <ReunionsCarousel />
      </main>
    </AppShell>
  );
}
