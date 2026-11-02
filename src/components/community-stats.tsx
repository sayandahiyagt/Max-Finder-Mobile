import { Eye, PawPrint, ShieldCheck } from "lucide-react";

import type { CommunityActivityCounts } from "@/features/search/types";
import styles from "@/app/page.module.css";

export function CommunityStats({
  stats,
}: {
  stats: CommunityActivityCounts | null;
}) {
  if (!stats) {
    return (
      <section
        className={styles.statsGrid}
        aria-label="Community recovery statistics"
      >
        <p role="status" aria-live="polite">
          Community statistics are temporarily unavailable.
        </p>
      </section>
    );
  }

  return (
    <section
      className={styles.statsGrid}
      aria-label="Community recovery statistics"
    >
      <div className={`${styles.statCard} ${styles.statCardLost}`}>
        <span className={styles.statIcon}>
          <PawPrint size={17} />
        </span>
        <div>
          <strong>{stats.lost}</strong>
          <span>Active lost pets</span>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statCardSpotted}`}>
        <span className={styles.statIcon}>
          <Eye size={17} />
        </span>
        <div>
          <strong>{stats.spottings}</strong>
          <span>Community spottings</span>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statCardFound}`}>
        <span className={styles.statIcon}>
          <ShieldCheck size={17} />
        </span>
        <div>
          <strong>{stats.found}</strong>
          <span>Pets found</span>
        </div>
      </div>
    </section>
  );
}

export function CommunityStatsLoading() {
  return (
    <section
      className={styles.statsGrid}
      aria-label="Community recovery statistics"
      aria-busy="true"
    >
      <p role="status" aria-live="polite">
        Loading community statistics…
      </p>
    </section>
  );
}
