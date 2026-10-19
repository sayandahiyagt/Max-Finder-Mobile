export type ReunionReport = {
  id: string;
  petName: string;
  species?: string | null;
  breed?: string | null;
  locationLabel?: string | null;
  imageUrl: string | null;
  lastSeenAt: string;
};

export type RawReunionReport = {
  id: string;
  pet_name: string;
  species?: string | null;
  breed?: string | null;
  location_label?: string | null;
  image_path?: string | null;
  last_seen_at: string;
  updated_at?: string | null;
};

export function buildImageUrl(
  getImageUrl: (imagePath: string) => string,
  imagePath: string | null | undefined,
): string | null {
  if (!imagePath) return null;
  try {
    return getImageUrl(imagePath);
  } catch {
    return null;
  }
}

export function formatReunions(
  rows: RawReunionReport[],
  getImageUrl: (imagePath: string) => string,
): ReunionReport[] {
  return rows.map((row) => ({
    id: row.id,
    petName: row.pet_name,
    species: row.species,
    breed: row.breed,
    locationLabel: row.location_label,
    imageUrl: buildImageUrl(getImageUrl, row.image_path),
    lastSeenAt: row.last_seen_at,
  }));
}
