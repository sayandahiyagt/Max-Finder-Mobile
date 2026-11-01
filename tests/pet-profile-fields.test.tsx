import { renderToStaticMarkup } from "react-dom/server";

import { PetProfileFields } from "@/components/pet-profile-fields";
import { dummyPetProfileFields } from "./fixtures/dummy-data";

jest.mock("next/image", () => ({ __esModule: true, default: () => null }));

describe("PetProfileFields", () => {
  it("renders all profile fields for creation with the existing defaults", () => {
    const markup = renderToStaticMarkup(
      <PetProfileFields pet={null} imageUrl={null} editing={false} />,
    );

    for (const name of [
      "name",
      "species",
      "breed",
      "color",
      "size",
      "age",
      "dateOfBirth",
      "description",
      "image",
    ]) {
      expect(markup).toContain(`name="${name}"`);
    }
    expect(markup).toContain('value="dog"');
    expect(markup).toContain('value="small"');
    expect(markup).toContain("Profile image");
    expect(markup).not.toContain('name="removeImage"');
    expect(markup).toContain('name="species" required');
    expect(markup).toContain('name="size" required');
  });

  it("prefills edit fields and keeps image replacement and removal controls", () => {
    const markup = renderToStaticMarkup(
      <PetProfileFields
        pet={dummyPetProfileFields}
        imageUrl="https://images.example/mochi.png"
        editing={true}
      />,
    );

    for (const value of [
      "Mochi",
      "Domestic Shorthair",
      "Gray tabby",
      "2021-04-12",
      "Gray tabby with a white chest.",
    ]) {
      expect(markup).toContain(value);
    }
    expect(markup).toContain('name="removeImage"');
    expect(markup).toContain("Replace profile image");
    expect(markup).toContain('name="species" required');
    expect(markup).toContain('name="size" required');
  });
});
