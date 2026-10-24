export type ReunionReport = {
  id: string;
  petName: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
  locationLabel?: string | null;
  imageUrl: string | null;
  lastSeenAt: string;
  reunitedAt?: string | null;
};

export type RawReunionReport = {
  id: string;
  pet_name: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
  location_label?: string | null;
  image_path?: string | null;
  last_seen_at: string;
  updated_at?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(
  record: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = record?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function displaySpecies(value: string | null): string | null {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function indexBy(
  rows: readonly unknown[],
  key: "id" | "pet_id",
): Map<string, Record<string, unknown>> {
  const index = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = optionalString(row, key);
    if (id) index.set(id, row);
  }
  return index;
}

export function reunionPetIds(rows: readonly unknown[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = optionalString(row, "pet_id");
    if (id) ids.add(id);
  }
  return [...ids];
}

export function mergeReunionData(
  reportRows: readonly unknown[],
  petRows: readonly unknown[],
  petImageRows: readonly unknown[],
): RawReunionReport[] {
  const petsById = indexBy(petRows, "id");
  const imagesByPetId = indexBy(petImageRows, "pet_id");

  return reportRows.flatMap((value) => {
    if (!isRecord(value)) return [];
    const id = optionalString(value, "id");
    const lastSeenAt = optionalString(value, "last_seen_at");
    if (!id || !lastSeenAt) return [];

    const petId = optionalString(value, "pet_id");
    const pet = petId ? petsById.get(petId) : undefined;
    const petImage = petId ? imagesByPetId.get(petId) : undefined;

    return [{
      id,
      pet_name:
        optionalString(value, "pet_name") ??
        optionalString(pet, "name") ??
        "Pet",
      species: displaySpecies(
        optionalString(value, "species") ?? optionalString(pet, "species"),
      ),
      breed:
        optionalString(value, "breed") ?? optionalString(pet, "breed"),
      color:
        optionalString(value, "color") ?? optionalString(pet, "color"),
      description:
        optionalString(value, "description") ??
        optionalString(pet, "description"),
      location_label:
        optionalString(value, "location_label") ??
        optionalString(value, "last_seen_location"),
      image_path:
        optionalString(value, "image_path") ??
        optionalString(pet, "image_path") ??
        optionalString(petImage, "storage_path"),
      last_seen_at: lastSeenAt,
      updated_at: optionalString(value, "updated_at"),
    }];
  });
}

export function buildImageUrl(
  getImageUrl: (imagePath: string) => string,
  imagePath: string | null | undefined,
): string | null {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  try {
    const normalizedPath = imagePath.replace(/^\/?lost-pet-images\//, "");
    return getImageUrl(normalizedPath) || null;
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
    color: row.color,
    description: row.description,
    locationLabel: row.location_label,
    imageUrl: buildImageUrl(getImageUrl, row.image_path),
    lastSeenAt: row.last_seen_at,
    reunitedAt: row.updated_at,
  }));
}
