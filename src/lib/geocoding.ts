const NOMINATIM_REVERSE_URL =
  "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL =
  "https://nominatim.openstreetmap.org/search";

const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_DURATION_SECONDS = 3600;

const REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MaxFinder/1.0 (community pet recovery app)",
};

export type LocationSearchResult = {
  latitude: number;
  longitude: number;
  label: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Shared request handling for both geocoding functions.
async function fetchJson(
  url: URL,
): Promise<{ data: unknown } | null> {
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      next: { revalidate: CACHE_DURATION_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    return { data: await response.json() };
  } catch {
    return null;
  }
}

function parseSearchResults(value: unknown): LocationSearchResult[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];

    const latitude = Number(entry.lat);
    const longitude = Number(entry.lon);
    const label =
      typeof entry.display_name === "string"
        ? entry.display_name.trim()
        : "";

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !label
    ) {
      return [];
    }

    return [{ latitude, longitude, label }];
  });
}

export async function searchLocations(
  query: string,
): Promise<LocationSearchResult[] | null> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", query);

  const result = await fetchJson(url);

  return result ? parseSearchResults(result.data) : null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));

  const result = await fetchJson(url);

  if (
    !result ||
    !isRecord(result.data) ||
    typeof result.data.display_name !== "string"
  ) {
    return null;
  }

  const address = result.data.display_name.trim();

  return address ? address.slice(0, 255) : null;
}