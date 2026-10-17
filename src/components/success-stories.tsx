"use client";

import Link from "next/link";

import { buildStories, type StoryCard } from "@/lib/success-stories";
import type { ReportCard } from "@/types/reports";
import styles from "./success-stories.module.css";

export type SuccessStoriesProps = {
  reports: ReportCard[];
  showDemo?: boolean;
};

export function SuccessStories({
  reports,
  showDemo = false,
}: SuccessStoriesProps) {
  const stories = buildStories(reports, showDemo);

  const ctaLinks = [
    { label: "Report a lost pet", href: "/lost-pets/new" },
    { label: "Post a spotting", href: "/spottings/new" },
    { label: "Browse animals", href: "/" },
  ];

  return (
    <section className={styles.successSection} aria-label="Success stories">
      <header className={styles.successHeader}>
        <p className="eyebrow">Community impact</p>
        <h2>Every reunion starts with someone who cares.</h2>
        <p>
          Reports, sightings, and neighbors like you help bring pets back
          together with the families who love them.
        </p>
      </header>

      {stories.length > 0 ? (
        <div className={styles.successGrid}>
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
          Stories of successful reunions will appear here as reports are found.
        </p>
      )}

      <div className={styles.ctaStrip}>
        <p>Help make the next reunion possible.</p>
        <div className={styles.ctaButtons}>
          {ctaLinks.map((link) => (
            <Link key={link.href} className="primary-button" href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ story }: { story: StoryCard }) {
  const isDemo = !!story.demo;
  const date = story.date ? new Date(story.date).toLocaleDateString() : null;

  return (
    <article
      className={styles.storyCard}
      data-demo={isDemo ? "true" : undefined}
      aria-label={isDemo ? `Demo story: ${story.title}` : story.title}
    >
      <span className={styles.storyBadge}>{story.label}</span>
      {isDemo && <span className={styles.demoBadge}>Demo</span>}
      <div className={styles.storyImage}>
        {story.imageUrl ? (
          <img src={story.imageUrl} alt={story.petName ?? story.title} loading="lazy" />
        ) : (
          <span className={styles.storyImagePlaceholder}>Story photo pending</span>
        )}
      </div>
      <div className={styles.storyBody}>
        <h3 className={styles.storyTitle}>{story.title}</h3>
        <p className={styles.storySummary}>{story.summary}</p>
        {story.locationLabel && (
          <p className={styles.storyMeta}>{story.locationLabel}</p>
        )}
        {date && (
          <p className={styles.storyMeta}>
            {isDemo ? "Demonstrated" : "Reunited"} {date}
          </p>
        )}
        <Link className={styles.storyLink} href="/">
          Read more →
        </Link>
      </div>
    </article>
  );
}
