"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

import { LocalizedDateTime } from "@/components/localized-date-time";
import {
  parseReunionResponse,
  type ReunionReport,
} from "@/features/reunions/formatting";
import styles from "./reunions-carousel.module.css";

export function ReunionsCarousel() {
  const [reunions, setReunions] = useState<ReunionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/reunions", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Reunions request failed");
        const payload: unknown = await response.json();
        const parsed = parseReunionResponse(payload);
        if (!parsed) throw new Error("Reunions response is invalid.");
        return parsed;
      })
      .then((data) => {
        setReunions(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
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
      <section
        className={styles.reunionSection}
        aria-label="Pet success stories"
      >
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
          <div className={styles.reunionCarousel__viewport} ref={viewportRef}>
            <div className={styles.reunionCarousel__container}>
              {reunions.map((reunion) => (
                <div className={styles.reunionCarousel__slide} key={reunion.id}>
                  <Link
                    href={`/lost-pets/reports/${reunion.id}`}
                    className={styles.reunionCard}
                  >
                    {reunion.imageUrl ? (
                      <Image
                        className={styles.reunionImage}
                        src={reunion.imageUrl}
                        width={600}
                        height={290}
                        unoptimized
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
                        <p>
                          {reunion.species} · {reunion.breed}
                        </p>
                      ) : (
                        <p>{reunion.species ?? reunion.breed ?? "Pet"}</p>
                      )}
                      {reunion.color && <p>{reunion.color}</p>}
                      <p>{reunion.locationLabel ?? "Address unavailable"}</p>
                      {reunion.description && <p>{reunion.description}</p>}
                      <strong>
                        Reunited:{" "}
                        <LocalizedDateTime
                          value={reunion.reunitedAt ?? reunion.lastSeenAt}
                          dateOnly
                        />
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
