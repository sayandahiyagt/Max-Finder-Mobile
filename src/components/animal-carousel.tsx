"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AnimalCard } from "@/components/animal-card";
import type { ReportCard } from "@/types/reports";
import {
  canScrollLeft,
  canScrollRight,
  filterReports,
  type ReportFilter,
} from "@/lib/carousel";
import styles from "./animal-carousel.module.css";

export type AnimalCarouselProps = {
  reports: ReportCard[];
  loading?: boolean;
  error?: string | null;
};

const filters: { value: ReportFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lost", label: "Lost" },
  { value: "found", label: "Found" },
];

export function AnimalCarousel({
  reports,
  loading = false,
  error = null,
}: AnimalCarouselProps) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardStepRef = useRef<number>(0);

  const reducedMotion = (): boolean =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const filtered = filterReports(reports, filter);

  const measureCardStep = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.children.length === 0) return 0;
    return (track.children[0] as HTMLElement).getBoundingClientRect().width;
  }, []);

  useEffect(() => {
    cardStepRef.current = measureCardStep();
  }, [measureCardStep, filtered]);

  const refreshEdges = useCallback(() => {
    const track = trackRef.current;
    setCanLeft(canScrollLeft(track));
    setCanRight(canScrollRight(track));
  }, []);

  useEffect(() => {
    refreshEdges();
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      refreshEdges();
      const cards = Array.from(track.children) as HTMLElement[];
      if (cards.length === 0) return;
      const containerRect = track.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let nearest = 0;
      let smallest = Infinity;
      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenter - containerCenter);
        if (distance < smallest) {
          smallest = distance;
          nearest = index;
        }
      });
      setActiveIndex(nearest);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [filtered, refreshEdges]);

  const scrollToCard = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || track.children[index] == null) return;
    track.scrollLeft = (track.children[index] as HTMLElement).offsetLeft;
    track.focus();
    setActiveIndex(index);
  }, []);

  const scrollByStep = useCallback(
    (delta: number) => {
      const track = trackRef.current;
      if (!track) return;
      const step = cardStepRef.current || track.clientWidth;
      track.scrollBy({
        left: step * delta,
        behavior: reducedMotion() ? "auto" : "smooth",
      });
      track.focus();
    },
    [],
  );

  const handlePrev = () => scrollByStep(-1);
  const handleNext = () => scrollByStep(1);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (canLeft) handlePrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (canRight) handleNext();
    }
  };

  const isLoading = loading && error === null;
  const isEmpty = !loading && error === null && filtered.length === 0;
  const hasError = !!error;

  return (
    <section className={styles.carouselSection} aria-label="Lost and found animals">
      <div className={styles.carouselHeader}>
        <p className="eyebrow">Community recovery</p>
        <h2>Pets who need your help</h2>
        <p>
          Browse recent lost and found reports and help reconnect pets with
          their families.
        </p>
      </div>

      <div className={styles.carouselFilters} role="group" aria-label="Filter reports">
        {filters.map((filterOption) => (
          <button
            type="button"
            key={filterOption.value}
            className={`${styles.filterButton} ${
              filter === filterOption.value ? styles.filterButtonActive : ""
            }`}
            aria-pressed={filter === filterOption.value}
            onClick={() => {
              setFilter(filterOption.value);
              setActiveIndex(0);
              cardStepRef.current = measureCardStep();
            }}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {hasError && (
        <div className="empty-state" role="status">
          {error}
        </div>
      )}

      {isLoading && (
        <div className={styles.carouselLoading} aria-label="Loading reports">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.carouselSkeleton}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonBody}>
                <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                <span className={styles.skeletonLine} />
                <span className={styles.skeletonLine} style={{ width: "60%" }} />
                <span className={styles.skeletonLine} style={{ width: "80%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !hasError && isEmpty && (
        <div className="empty-state">
          <p>No reports match this filter right now.</p>
          <a className="primary-button" href="/lost-pets/new">
            Report a lost pet
          </a>
        </div>
      )}

      {!isLoading && !hasError && filtered.length > 0 && (
        <div className={styles.carouselViewport}>
          <button
            type="button"
            className={`${styles.carouselButton} ${styles.carouselButtonPrev}`}
            aria-label="Previous report"
            onClick={handlePrev}
            disabled={!canLeft}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className={`${styles.carouselButton} ${styles.carouselButtonNext}`}
            aria-label="Next report"
            onClick={handleNext}
            disabled={!canRight}
          >
            <ChevronRight size={20} />
          </button>

          <div
            ref={trackRef}
            className={styles.carouselTrack}
            role="region"
            aria-roledescription="carousel"
            aria-label="Animal reports"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {filtered.map((report, index) => (
              <div
                key={report.id}
                className={styles.carouselCard}
                role="group"
                aria-label={`${index + 1} of ${filtered.length}`}
              >
                <AnimalCard report={report} />
              </div>
            ))}
          </div>

          <div className={styles.carouselControls}>
            <span className={styles.carouselCount} aria-live="polite">
              {filtered.length} animal{filtered.length === 1 ? "" : "s"}
            </span>
            <div
              className={styles.carouselDots}
              role="group"
              aria-label="Report navigation"
            >
              {filtered.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  className={`${styles.carouselDot} ${
                    index === activeIndex ? styles.carouselDotActive : ""
                  }`}
                  aria-label={`Go to report ${index + 1}`}
                  aria-current={index === activeIndex}
                  onClick={() => scrollToCard(index)}
                />
              ))}
            </div>
            <span className={styles.carouselCount}>
              {activeIndex + 1}/{filtered.length}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
