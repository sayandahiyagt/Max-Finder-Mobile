import type { MapReport } from "./types";
import type { MapActivityType } from "./types";
import { isRecord } from "@/lib/record";

type MapPinType = Exclude<MapActivityType, "all">;

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function parsePin(value: unknown, type: MapPinType): MapReport | null {
  if (!isRecord(value) || value.type !== type) return null;
  const { id, name, timestamp, position } = value;
  const species = nullableString(value.species);
  const breed = nullableString(value.breed);
  const locationLabel = nullableString(value.locationLabel);
  const imageUrl = nullableString(value.imageUrl);

  if (
    typeof id !== "string" ||
    !id ||
    typeof name !== "string" ||
    typeof timestamp !== "string" ||
    !Number.isFinite(Date.parse(timestamp)) ||
    species === undefined ||
    breed === undefined ||
    locationLabel === undefined ||
    imageUrl === undefined ||
    !Array.isArray(position) ||
    position.length !== 2 ||
    typeof position[0] !== "number" ||
    !Number.isFinite(position[0]) ||
    position[0] < -90 ||
    position[0] > 90 ||
    typeof position[1] !== "number" ||
    !Number.isFinite(position[1]) ||
    position[1] < -180 ||
    position[1] > 180
  ) {
    return null;
  }

  return {
    id,
    type,
    name,
    species,
    breed,
    locationLabel,
    imageUrl,
    timestamp,
    position: [position[0], position[1]],
  };
}

function parsePins(value: unknown, type: MapPinType): MapReport[] | null {
  if (!Array.isArray(value)) return null;
  const pins: MapReport[] = [];
  for (const entry of value) {
    const pin = parsePin(entry, type);
    if (!pin) return null;
    pins.push(pin);
  }
  return pins;
}

export function parseMapActivity(value: unknown): MapReport[] | null {
  if (!isRecord(value)) return null;
  const reports = parsePins(value.reports, "lost");
  const spottings = parsePins(value.spottings, "spotted");
  if (!reports || !spottings) return null;
  return [...reports, ...spottings];
}
