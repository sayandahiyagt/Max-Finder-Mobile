"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

import type { ReunionReport } from "@/lib/reunions";
import styles from "./reunions-carousel.module.css";

type ApiError = { error?: string };

export function ReunionsCarousel() {
  const [reunions, setReunions] = useState<ReunionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/reunions", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Reunions request failed");
        return response.json() as Promise<{ reunions: ReunionReport[] } & ApiError>;
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReunions(data.reunions);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReunions([]);
        setFetchError("Reunions could not be loaded. Try again shortly.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const [viewportRef, emblaApi] = useEmblaCarousel({
    loop: false,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", update);
    emblaApi.on("init", update);
    update();
    return () => {
      emblaApi.off("select", update);
    };
  }, [emblaApi]);

  if (fetchError) {
    return (
      <section className={styles.reunionSection} aria-label="Pet success stories">
        <p className={styles.reunionEyebrow}>
          <ShieldCheck size={15} /> Success stories
        </p>
        <h2>Reunited pets</h2>
        <p role="status">{fetchError}</p>
      </section>
    );
  }

  return (
    <section className={styles.reunionSection} aria-label="Pet success stories">
      <p className={styles.reunionEyebrow}>
        <ShieldCheck size={15} /> Success stories
      </p>
      <h2>Reunited pets</h2>
      {isLoading ? (
        <div className={styles.reunionLoading}>Loading reunions…</div>
      ) : reunions.length === 0 ? (
        <p className={styles.reunionCarousel__empty}>
          No reunions to display yet. Be the first to share a happy ending.
        </p>
      ) : (
        <div className={styles.reunionCarousel}>
          <div
            className={styles.reunionCarousel__viewport}
            ref={viewportRef}
          >
            <div className={styles.reunionCarousel__container}>
              {reunions.map((reunion) => (
                <div
                  className={styles.reunionCarousel__slide}
                  key={reunion.id}
                >
                  <Link
                    href={`/lost-pets/reports/${reunion.id}`}
                    className={styles.reunionCard}
                  >
                    {reunion.imageUrl ? (
                      <img
                        className={styles.reunionImage}
                        src={reunion.imageUrl}
                        alt={reunion.petName}
                      />
                    ) : (
                      <div
                        className={`${styles.reunionImage} ${styles.reunionImagePlaceholder}`}
                      >
                        No image
                      </div>
                    )}
                    <div className={styles.reunionCardBody}>
                      <h3>{reunion.petName}</h3>
                      <span className={styles.reunionBadge}>Reunited</span>
                      {reunion.species && reunion.breed ? (
                        <p>{reunion.species} · {reunion.breed}</p>
                      ) : (
                        <p>{reunion.species ?? reunion.breed ?? ""}</p>
                      )}
                      <p>{reunion.locationLabel ?? "Address unavailable"}</p>
                      <strong>
                        Last seen: {new Date(reunion.lastSeenAt).toLocaleDateString()}
                      </strong>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`${styles.reunionControlBtn} ${styles.reunionControlBtnPrev}`}
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label="Previous reunion"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className={`${styles.reunionControlBtn} ${styles.reunionControlBtnNext}`}
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            aria-label="Next reunion"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

export default ReunionsCarousel;
