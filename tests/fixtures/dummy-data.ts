import type { ImageUpload } from "@/lib/image-upload";
import type { PetImageStorage } from "@/features/pets/types";
import type { SpottingImageStorage } from "@/features/spottings/types";

export const dummyUsers = {
  owner: {
    userId: "00000000-0000-4000-8000-000000000001",
    authProviderId: "00000000-0000-4000-8000-000000000101",
    email: "owner@example.test",
    displayName: "Riley Owner",
    role: "USER",
  },
  finder: {
    userId: "00000000-0000-4000-8000-000000000002",
    authProviderId: "00000000-0000-4000-8000-000000000102",
    email: "sam.finder@example.test",
    displayName: "Sam Finder",
    role: "USER",
  },
  admin: {
    userId: "00000000-0000-4000-8000-000000000003",
    authProviderId: "00000000-0000-4000-8000-000000000103",
    email: "admin@example.test",
    displayName: "Taylor Admin",
    role: "ADMIN",
  },
} as const;

export function dummyImageUpload(name = "dummy.png"): ImageUpload {
  return {
    file: new File(["synthetic test image"], name, { type: "image/png" }),
    contentType: "image/png",
    extension: "png",
  };
}

export const dummyPetImageStorage: PetImageStorage = {
  async upload(image, authUserId) {
    return `${authUserId}/pets/${image.file.name}`;
  },
  async remove() {
    return true;
  },
};

export const dummySpottingImageStorage: SpottingImageStorage = {
  async upload(image) {
    return `anonymous/${image.file.name}`;
  },
  async remove() {
    return true;
  },
};

export const dummyPet = {
  petId: "00000000-0000-4000-8000-000000000201",
  ownerId: dummyUsers.owner.userId,
  name: "Mochi",
  species: "Cat",
  breed: "Domestic Shorthair",
  color: "Gray tabby",
  size: "Small",
  description: "Gray tabby with a white chest.",
  dateOfBirth: "2021-04-12",
};

export const dummyPetProfileFields = {
  name: "Mochi",
  species: "cat",
  breed: "Domestic Shorthair",
  color: "Gray tabby",
  size: "small",
  age: 5,
  description: "Gray tabby with a white chest.",
  dateOfBirth: new Date("2021-04-12T00:00:00.000Z"),
};

export const dummyReport = {
  reportId: "00000000-0000-4000-8000-000000000301",
  petId: dummyPet.petId,
  status: "LOST",
  lastSeenAt: "2026-10-20T18:30:00.000Z",
  lastSeenLat: 40.7128,
  lastSeenLng: -74.006,
  lastSeenAddress: "Example Park, Example City",
  contactMethod: "IN_APP",
  contactValue: null,
};

export const dummyConversation = {
  conversationId: "00000000-0000-4000-8000-000000000401",
  reportId: dummyReport.reportId,
  user1Id: dummyUsers.owner.userId,
  user2Id: dummyUsers.finder.userId,
};

export const dummyMessage = {
  messageId: "00000000-0000-4000-8000-000000000501",
  conversationId: dummyConversation.conversationId,
  senderId: dummyUsers.finder.userId,
  content: "I saw a cat matching Mochi near Example Park.",
};

export const dummySpotting = {
  id: "00000000-0000-4000-8000-000000000302",
  species: "Cat",
  breed: "Domestic Shorthair",
  weight_range: "Under 10 lbs",
  description: "Gray tabby near the park.",
  distinguishing_characteristics: "White chest",
  spotted_at: "2026-10-21T19:00:00.000Z",
  latitude: 40.7132,
  longitude: -74.0056,
  location_label: "Example Park, Example City",
  image_path: "dummy/spotting.webp",
};

export const dummyMapActivity = {
  reports: [
    {
      id: dummyReport.reportId,
      type: "lost",
      name: dummyPet.name,
      species: dummyPet.species,
      breed: dummyPet.breed,
      locationLabel: dummyReport.lastSeenAddress,
      imageUrl: "https://images.example/mochi.webp",
      timestamp: dummyReport.lastSeenAt,
      position: [dummyReport.lastSeenLat, dummyReport.lastSeenLng],
    },
  ],
  spottings: [
    {
      id: dummySpotting.id,
      type: "spotted",
      name: "",
      species: dummySpotting.species,
      breed: dummySpotting.breed,
      locationLabel: dummySpotting.location_label,
      imageUrl: "https://images.example/spotting.webp",
      timestamp: dummySpotting.spotted_at,
      position: [dummySpotting.latitude, dummySpotting.longitude],
    },
  ],
} as const;

export const dummyCommunityActivityCounts = {
  lost: 2,
  found: 1,
  spottings: 3,
};
