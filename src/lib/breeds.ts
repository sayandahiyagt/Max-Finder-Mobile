export const breedOptions = {
  Dog: ["Labrador Retriever", "Golden Retriever", "German Shepherd", "Poodle", "Bulldog", "Beagle", "Other"],
  Cat: ["Domestic Shorthair", "Domestic Longhair", "Siamese", "Maine Coon", "Persian", "Ragdoll", "Other"],
} as const;

export type PetSpecies = keyof typeof breedOptions;
