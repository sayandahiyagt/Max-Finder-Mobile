/** @jest-environment jsdom */

import { act, createElement } from "react";

import { SpottingPetDetails } from "@/components/spotting-pet-details";
import { createDomRoot } from "./helpers/dom";

describe("SpottingPetDetails", () => {
  it("keeps the optional breed choices in sync with the selected species", async () => {
    const { container, root, cleanup } = createDomRoot();

    await act(async () => root.render(createElement(SpottingPetDetails)));

    const species = container.querySelector<HTMLSelectElement>(
      'select[name="species"]',
    );
    const breed = container.querySelector<HTMLSelectElement>(
      'select[name="breed"]',
    );
    expect(species).not.toBeNull();
    expect(breed).not.toBeNull();
    expect(Array.from(breed?.options ?? [], (option) => option.text)).toContain(
      "Labrador Retriever",
    );

    await act(async () => {
      if (!species) throw new Error("Species selector is missing.");
      species.value = "Cat";
      species.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const catBreeds = Array.from(
      container.querySelector<HTMLSelectElement>(
        'select[name="breed"]',
      )?.options ?? [],
      (option) => option.text,
    );
    expect(catBreeds).toContain("Siamese");
    expect(catBreeds).not.toContain("Labrador Retriever");

    await cleanup();
  });

  it("restores the selected species and optional spotting details", async () => {
    const { container, root, cleanup } = createDomRoot();

    await act(async () =>
      root.render(
        createElement(SpottingPetDetails, {
          values: {
            species: "Cat",
            breed: "Siamese",
            weightRange: "Under 10 lbs",
            description: "Synthetic spotting details",
            distinguishingCharacteristics: "Blue collar",
          },
        }),
      ),
    );

    expect(
      container.querySelector<HTMLSelectElement>('select[name="species"]')
        ?.value,
    ).toBe("Cat");
    expect(
      container.querySelector<HTMLSelectElement>('select[name="breed"]')
        ?.value,
    ).toBe("Siamese");
    expect(
      container.querySelector<HTMLSelectElement>('select[name="weightRange"]')
        ?.value,
    ).toBe("Under 10 lbs");
    expect(
      container.querySelector<HTMLTextAreaElement>('textarea[name="description"]')
        ?.value,
    ).toBe("Synthetic spotting details");
    expect(container.querySelector("details")?.open).toBe(true);

    await cleanup();
  });
});
