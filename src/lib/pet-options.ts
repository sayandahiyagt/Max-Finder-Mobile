export const breedOptions = {
  Dog: [
    "Labrador Retriever",
    "Golden Retriever",
    "German Shepherd",
    "Poodle",
    "Bulldog",
    "Beagle",
    "Other",
  ],
  Cat: [
    "Domestic Shorthair",
    "Domestic Longhair",
    "Siamese",
    "Maine Coon",
    "Persian",
    "Ragdoll",
    "Other",
  ],
} as const;

export type PetSpecies = keyof typeof breedOptions;
export type PetProfileSpecies = "dog" | "cat";
export type PetSize = "small" | "medium" | "large";

export function isPetSpecies(value: unknown): value is PetSpecies {
  return value === "Dog" || value === "Cat";
}

export const weightRanges = [
  "Under 10 lbs",
  "10–25 lbs",
  "26–50 lbs",
  "51–75 lbs",
  "Over 75 lbs",
  "Unknown",
] as const;

export type WeightRange = (typeof weightRanges)[number];

const weightRangeSet: ReadonlySet<string> = new Set(weightRanges);

export function isWeightRange(value: string): value is WeightRange {
  return weightRangeSet.has(value);
}

export function isPetProfileSpecies(
  value: string,
): value is PetProfileSpecies {
  return value === "dog" || value === "cat";
}

export function isPetSize(value: string): value is PetSize {
  return value === "small" || value === "medium" || value === "large";
}
