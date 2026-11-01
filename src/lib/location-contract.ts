import { parseCoordinates } from "./coordinates";
import { isRecord } from "./record";

export type LocationSearchResult = {
  latitude: number;
  longitude: number;
  label: string;
};

export function parseLocationSearchResult(
  value: unknown,
): LocationSearchResult | null {
  if (!isRecord(value)) return null;
  const coordinates = parseCoordinates(value.latitude, value.longitude);
  const label = typeof value.label === "string" ? value.label.trim() : "";
  return coordinates && label ? { ...coordinates, label } : null;
}

export function parseLocationSearchResults(
  value: unknown,
): LocationSearchResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const result = parseLocationSearchResult(entry);
    return result ? [result] : [];
  });
}

export function isPlaceholderLocationLabel(
  value: string | null | undefined,
): boolean {
  const label = value?.trim();
  return (
    !label ||
    /^(?:your )?current location$|^selected map location$|^finding address…?$|^address unavailable$/i.test(
      label,
    )
  );
}

export function parseReverseGeocodeLabel(value: unknown): string | null {
  if (!isRecord(value) || typeof value.label !== "string") return null;
  const label = value.label.trim();
  return label ? label.slice(0, 255) : null;
}

export function formatStoredLocationLabel(
  value: string | null | undefined,
): string {
  const label = value?.trim();
  if (isPlaceholderLocationLabel(label)) {
    return "Address unavailable";
  }
  return label ?? "Address unavailable";
}
