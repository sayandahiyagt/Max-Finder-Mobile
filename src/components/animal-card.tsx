"use client";

import Link from "next/link";

import type { ReportCard } from "@/types/reports";

type AnimalCardProps = {
  report: ReportCard;
};

export function AnimalCard({ report }: AnimalCardProps) {
  const isFound = report.status === "FOUND";
  const statusClass = isFound ? "found" : "lost";
  const statusLabel = isFound ? "Found" : "Lost";
  const fallbackName = isFound ? "Found pet" : "Lost pet";
  const name = report.petName ?? fallbackName;
  const speciesBreed = [report.species, report.breed].filter(Boolean).join(" · ");
  const lastSeen = report.lastSeenAt
    ? new Date(report.lastSeenAt).toLocaleDateString()
    : null;

  return (
    <article className="animal-card">
      <div className="animal-card-image">
        {report.imageUrl ? (
          <img
            src={report.imageUrl}
            alt={name}
            loading="lazy"
            width={400}
            height={225}
          />
        ) : (
          <div className="animal-card-image-placeholder">{name} photo pending</div>
        )}
      </div>
      <div className="animal-card-body">
        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
        <h3 className="animal-card-name">{name}</h3>
        {speciesBreed && (
          <p className="animal-card-species">{speciesBreed}</p>
        )}
        {report.locationLabel && (
          <p className="animal-card-location">{report.locationLabel}</p>
        )}
        {lastSeen && (
          <p className="animal-card-date">Reported {lastSeen}</p>
        )}
        <Link
          className="animal-card-action"
          href={`/lost-pets/reports/${report.id}`}
        >
          View report
        </Link>
      </div>
    </article>
  );
}
