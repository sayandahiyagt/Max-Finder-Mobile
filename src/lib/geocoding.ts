import { parseCoordinates } from "./coordinates";
import {
  parseLocationSearchResult,
  type LocationSearchResult,
} from "./location-contract";
import { isRecord } from "./record";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const REQUEST_TIMEOUT_MS = 8_000;

const requestHeaders = {
  Accept: "application/json",
  "User-Agent": "MaxFinder/1.0 (community pet recovery app)",
};

function parseSearchResults(value: unknown): LocationSearchResult[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const result = parseLocationSearchResult({
      latitude: entry.lat,
      longitude: entry.lon,
      label: entry.display_name,
    });
    return result ? [result] : [];
  });
}

export async function searchLocations(
  query: string,
): Promise<LocationSearchResult[] | null> {
  try {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("q", query);

    const response = await fetch(url, {
      headers: requestHeaders,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;
    return parseSearchResults(await response.json());
  } catch {
    return null;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const coordinates = parseCoordinates(latitude, longitude);
  if (!coordinates) return null;

  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coordinates.latitude));
    url.searchParams.set("lon", String(coordinates.longitude));

    const response = await fetch(url, {
      headers: requestHeaders,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const result: unknown = await response.json();
    if (!isRecord(result) || typeof result.display_name !== "string") {
      return null;
    }
    const address = result.display_name.trim();
    return address ? address.slice(0, 255) : null;
  } catch {
    return null;
  }
}
