import { createLostPetReport } from "@/app/lost-pets/actions";
import { createSpotting } from "@/app/spottings/actions";
import { createReportForOwnedPet } from "@/features/lost-pets/application";
import { createSpotting as createSpottingInApp } from "@/features/spottings/application";
import { reverseGeocode } from "@/lib/geocoding";
import { spottingImageStorage } from "@/lib/supabase/media";
import { requireUser } from "@/lib/auth";
import { initialLostPetReportActionState } from "@/features/lost-pets/form-state";
import { initialSpottingActionState } from "@/features/spottings/form-state";
import { dummyUsers } from "./fixtures/dummy-data";

function setLocalDateTime(
  formData: FormData,
  name: string,
  value: string,
  timezoneOffset = "0",
) {
  formData.set(name, value);
  formData.set(`${name}TimezoneOffset`, timezoneOffset);
}

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/features/lost-pets/application", () => ({
  createReportForOwnedPet: jest.fn(),
  removeLostPetReport: jest.fn(),
  updateLostPetReport: jest.fn(),
}));
jest.mock("@/features/spottings/application", () => ({
  createSpotting: jest.fn(),
}));
jest.mock("@/lib/geocoding", () => ({ reverseGeocode: jest.fn() }));
jest.mock("@/lib/supabase/media", () => ({
  spottingImageStorage: { upload: jest.fn(), remove: jest.fn() },
}));
jest.mock("@/lib/auth", () => {
  const { dummyUsers } = jest.requireActual<
    typeof import("./fixtures/dummy-data")
  >("./fixtures/dummy-data");
  return {
    requireUser: jest.fn().mockResolvedValue({
      user: { id: dummyUsers.owner.authProviderId },
      actor: { userId: dummyUsers.owner.userId },
    }),
  };
});

describe("location input validation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a lost report without a user-selected location", async () => {
    const formData = new FormData();
    formData.set("petId", "00000000-0000-4000-8000-000000000201");
    formData.set("weightRange", "Unknown");
    formData.set("description", "Synthetic report without coordinates.");
    formData.set("contactMethod", "in_app");
    formData.set("locationLabel", "Choose a point on the map.");
    setLocalDateTime(formData, "lastSeenAt", "2026-10-30T12:00");

    await expect(
      createLostPetReport(initialLostPetReportActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Please complete every report field.",
      values: { latitude: "", longitude: "", lastSeenAt: "2026-10-30T12:00" },
    });
    expect(createReportForOwnedPet).not.toHaveBeenCalled();
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(requireUser).toHaveBeenCalled();
  });

  it("rejects unsupported report contact methods at the action boundary", async () => {
    const formData = new FormData();
    formData.set("petId", "00000000-0000-4000-8000-000000000201");
    formData.set("weightRange", "Unknown");
    formData.set("description", "Synthetic report with invalid contact.");
    formData.set("contactMethod", "text_message");
    formData.set("locationLabel", "Local Park");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");
    setLocalDateTime(formData, "lastSeenAt", "2026-10-30T12:00");

    await expect(
      createLostPetReport(initialLostPetReportActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Please complete every report field.",
    });
    expect(createReportForOwnedPet).not.toHaveBeenCalled();
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it("converts the lost-report local time using the submitted timezone offset", async () => {
    const formData = new FormData();
    formData.set("petId", "00000000-0000-4000-8000-000000000201");
    formData.set("weightRange", "Unknown");
    formData.set("description", "Synthetic report with a local time.");
    formData.set("contactMethod", "in_app");
    formData.set("locationLabel", "Local Park");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");
    setLocalDateTime(formData, "lastSeenAt", "2026-10-30T12:00", "300");
    jest.mocked(createReportForOwnedPet).mockResolvedValue({ id: "report-1" });

    await createLostPetReport(initialLostPetReportActionState, formData);

    expect(createReportForOwnedPet).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: "00000000-0000-4000-8000-000000000201",
        ownerId: dummyUsers.owner.userId,
        report: expect.objectContaining({
          lastSeenAt: new Date("2026-10-30T17:00:00.000Z"),
        }),
      }),
    );
  });

  it("returns safe report errors with the selected location and entries", async () => {
    const formData = new FormData();
    formData.set("petId", "00000000-0000-4000-8000-000000000201");
    formData.set("weightRange", "Unknown");
    formData.set("description", "Synthetic report description.");
    formData.set("contactMethod", "in_app");
    formData.set("contactValue", "private@example.test");
    formData.set("locationLabel", "Local Park");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");
    setLocalDateTime(formData, "lastSeenAt", "2026-10-30T12:00");
    jest
      .mocked(createReportForOwnedPet)
      .mockRejectedValue(new Error("database detail must not reach the form"));

    const state = await createLostPetReport(
      initialLostPetReportActionState,
      formData,
    );

    expect(state).toMatchObject({
      kind: "error",
      message: "Report could not be published. Please try again.",
      values: {
        description: "Synthetic report description.",
        contactValue: "private@example.test",
        lastSeenAt: "2026-10-30T12:00",
        locationLabel: "Local Park",
        latitude: "40.7",
        longitude: "-74",
      },
    });
    expect(state.message).not.toContain("database detail");
  });

  it("rejects an anonymous spotting without a user-selected location", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    setLocalDateTime(formData, "spottedAt", "2026-10-30T12:00");

    await expect(
      createSpotting(initialSpottingActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Please provide an image, time, and location.",
    });
    expect(createSpottingInApp).not.toHaveBeenCalled();
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it("rejects a spotting species outside the shared domain", async () => {
    const formData = new FormData();
    formData.set("species", "Rabbit");
    setLocalDateTime(formData, "spottedAt", "2026-10-30T12:00");

    await expect(
      createSpotting(initialSpottingActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Please select whether the spotted pet is a dog or cat.",
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(createSpottingInApp).not.toHaveBeenCalled();
  });

  it("rejects malformed spotting time before external or database writes", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    setLocalDateTime(formData, "spottedAt", "not-a-date");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");

    await expect(
      createSpotting(initialSpottingActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Please enter a valid spotting date and time.",
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(createSpottingInApp).not.toHaveBeenCalled();
  });

  it("rejects a missing spotting time instead of substituting the current time", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");

    await expect(
      createSpotting(initialSpottingActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Please enter a valid spotting date and time.",
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(createSpottingInApp).not.toHaveBeenCalled();
  });

  it("rejects weight values outside the shared domain before external writes", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    formData.set("weightRange", "Over 100 lbs");
    setLocalDateTime(formData, "spottedAt", "2026-10-30T12:00");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");

    await expect(
      createSpotting(initialSpottingActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Choose a valid weight range.",
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(createSpottingInApp).not.toHaveBeenCalled();
  });

  it("rejects an unsupported image before geocoding or storage upload", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    setLocalDateTime(formData, "spottedAt", "2026-10-30T12:00");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");
    formData.set("locationLabel", "Local Park");
    formData.set(
      "image",
      new File(["dummy image"], "pet.gif", { type: "image/gif" }),
    );

    await expect(
      createSpotting(initialSpottingActionState, formData),
    ).resolves.toMatchObject({
      kind: "error",
      message: "Images must be JPEG, PNG, or WebP files up to 15 MB.",
    });
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(createSpottingInApp).not.toHaveBeenCalled();
  });

  it("publishes a valid spotting image through the Storage boundary", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    formData.set("breed", "Labrador Retriever");
    formData.set("weightRange", "51–75 lbs");
    formData.set("description", "Seen near the park entrance.");
    formData.set("distinguishingCharacteristics", "Blue collar.");
    setLocalDateTime(formData, "spottedAt", "2026-10-30T12:00", "300");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");
    formData.set(
      "image",
      new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "found-pet.png",
        { type: "image/png" },
      ),
    );
    jest.mocked(reverseGeocode).mockResolvedValue("Local Park");
    jest.mocked(createSpottingInApp).mockResolvedValue({ id: "spotting-1" });

    await createSpotting(initialSpottingActionState, formData);

    expect(createSpottingInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        species: "Dog",
        spottedAt: new Date("2026-10-30T17:00:00.000Z"),
        breed: "Labrador Retriever",
        weightRange: "51–75 lbs",
        description: "Seen near the park entrance.",
        distinguishingCharacteristics: "Blue collar.",
        latitude: 40.7,
        longitude: -74,
        locationLabel: "Local Park",
      }),
      expect.objectContaining({ contentType: "image/png", extension: "png" }),
      spottingImageStorage,
    );
  });

  it("returns safe feedback when the feature operation fails", async () => {
    const formData = new FormData();
    formData.set("species", "Dog");
    formData.set("description", "Synthetic spotting description.");
    setLocalDateTime(formData, "spottedAt", "2026-10-30T12:00", "300");
    formData.set("latitude", "40.7");
    formData.set("longitude", "-74");
    formData.set("locationLabel", "Local Park");
    formData.set(
      "image",
      new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "synthetic.png",
        { type: "image/png" },
      ),
    );
    jest.mocked(reverseGeocode).mockResolvedValue("Local Park");
    jest
      .mocked(createSpottingInApp)
      .mockRejectedValue(new Error("database internals"));

    const state = await createSpotting(initialSpottingActionState, formData);

    expect(state).toMatchObject({
      kind: "error",
      message: "Spotting could not be published. Please try again.",
      values: {
        species: "Dog",
        description: "Synthetic spotting description.",
        spottedAt: "2026-10-30T12:00",
        locationLabel: "Local Park",
        latitude: "40.7",
        longitude: "-74",
      },
    });
    expect(state.message).not.toContain("database internals");
  });
});
