const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const response = await fetch(
    `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "MaxFinder/1.0 (community pet recovery app)",
      },
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok) return null;

  const result = (await response.json()) as { display_name?: string };
  const address = result.display_name?.trim();
  return address ? address.slice(0, 255) : null;
}
