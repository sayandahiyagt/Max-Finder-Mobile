/** @jest-environment jsdom */

import { act, createElement, useState } from "react";
import type { Root } from "react-dom/client";

import { AdvancedMapFilters } from "@/components/advanced-map-filters";
import type { MapUiFilters } from "@/features/search/types";
import { breedOptions } from "@/lib/pet-options";
import { createDomRoot } from "./helpers/dom";

jest.mock("@/app/page.module.css", () =>
  new Proxy({}, { get: (_target, property) => property }),
);

function FilterHarness() {
  const [filters, setFilters] = useState<MapUiFilters>({
    activityType: "all",
    species: "Cat",
    breed: breedOptions.Cat[0],
    timeRange: "any",
  });
  return <AdvancedMapFilters filters={filters} onChange={setFilters} />;
}

describe("AdvancedMapFilters", () => {
  let root: Root;
  let container: HTMLDivElement;
  let cleanup: () => Promise<void>;

  beforeEach(() => {
    const dom = createDomRoot();
    container = dom.container;
    root = dom.root;
    cleanup = dom.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("opens the filter panel and clears a breed when species changes", async () => {
    await act(async () => root.render(createElement(FilterHarness)));
    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-expanded="false"]',
    );
    expect(toggle).not.toBeNull();

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const selects = container.querySelectorAll("select");
    const speciesSelect = selects.item(2);
    const breedSelect = selects.item(3);
    if (!speciesSelect || !breedSelect) {
      throw new Error("Expected species and breed filter controls.");
    }
    expect(speciesSelect.value).toBe("Cat");
    expect(breedSelect.value).toBe(breedOptions.Cat[0]);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");

    const setValue = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    )?.set;
    setValue?.call(speciesSelect, "Dog");
    await act(async () => {
      speciesSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(speciesSelect.value).toBe("Dog");
    expect(breedSelect.value).toBe("");
    expect(
      Array.from(breedSelect.options).some(
        ({ value }) => value === breedOptions.Dog[0],
      ),
    ).toBe(true);
  });
});
