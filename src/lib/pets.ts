export const PET_SPECIES = ["dog", "cat"] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const PET_BREEDS: Record<PetSpecies, string[]> = {
  dog: [
    "Labrador Retriever",
    "Golden Retriever",
    "German Shepherd",
    "French Bulldog",
    "Bulldog",
    "Poodle",
    "Beagle",
    "Mixed breed",
  ],
  cat: [
    "Domestic Shorthair",
    "Domestic Longhair",
    "Siamese",
    "Maine Coon",
    "Persian",
    "Ragdoll",
    "Bengal",
    "Mixed breed",
  ],
};

export const PET_SIZES = [
  { value: "small", label: "Small (under 20 lb)" },
  { value: "medium", label: "Medium (20–50 lb)" },
  { value: "large", label: "Large (over 50 lb)" },
] as const;
