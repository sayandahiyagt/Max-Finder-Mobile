/** @jest-environment jsdom */

import { act, createElement } from "react";
import type { Root } from "react-dom/client";

import { SpottingForm } from "@/components/spotting-form";
import { createDomRoot } from "./helpers/dom";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));
jest.mock("@/components/location-date-fields", () => ({
  LocationDateFields: ({
    initialValues,
  }: {
    initialValues?: {
      dateTime: string;
      timezoneOffset: string;
      locationLabel: string;
      latitude: string;
      longitude: string;
    };
  }) => (
    <>
      <input name="spottedAt" defaultValue={initialValues?.dateTime} />
      <input
        name="spottedAtTimezoneOffset"
        defaultValue={initialValues?.timezoneOffset}
      />
      <input name="locationLabel" defaultValue={initialValues?.locationLabel} />
      <input name="latitude" defaultValue={initialValues?.latitude} />
      <input name="longitude" defaultValue={initialValues?.longitude} />
    </>
  ),
}));
jest.mock("@/app/spottings/actions", () => ({
  createSpotting: async (
    previous: { submission: number },
    formData: FormData,
  ) => ({
    kind: "error",
    message: "Spotting could not be published. Please try again.",
    values: {
      species: String(formData.get("species") ?? ""),
      breed: String(formData.get("breed") ?? ""),
      weightRange: String(formData.get("weightRange") ?? ""),
      spottedAt: String(formData.get("spottedAt") ?? ""),
      spottedAtTimezoneOffset: String(
        formData.get("spottedAtTimezoneOffset") ?? "",
      ),
      description: String(formData.get("description") ?? ""),
      distinguishingCharacteristics: String(
        formData.get("distinguishingCharacteristics") ?? "",
      ),
      locationLabel: String(formData.get("locationLabel") ?? ""),
      latitude: String(formData.get("latitude") ?? ""),
      longitude: String(formData.get("longitude") ?? ""),
    },
    submission: previous.submission + 1,
  }),
}));

describe("SpottingForm", () => {
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

  it("retains submitted details and location after an action error", async () => {
    await act(async () => root.render(createElement(SpottingForm)));

    const species = container.querySelector<HTMLSelectElement>(
      '[name="species"]',
    );
    const breed = container.querySelector<HTMLSelectElement>('[name="breed"]');
    const description = container.querySelector<HTMLTextAreaElement>(
      '[name="description"]',
    );
    const form = container.querySelector("form");

    await act(async () => {
      if (species) {
        species.value = "Cat";
        species.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await act(async () => {
      if (breed) breed.value = "Siamese";
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(description, "Synthetic spotting details");
      description?.dispatchEvent(new Event("input", { bubbles: true }));
      for (const [name, value] of [
        ["spottedAt", "2026-10-30T12:00"],
        ["spottedAtTimezoneOffset", "300"],
        ["locationLabel", "Local Park"],
        ["latitude", "40.7"],
        ["longitude", "-74"],
      ] as const) {
        const input = container.querySelector<HTMLInputElement>(`[name="${name}"]`);
        const inputSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        inputSetter?.call(input, value);
        input?.dispatchEvent(new Event("input", { bubbles: true }));
      }
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Select the image again to resubmit.",
    );
    expect(container.querySelector<HTMLSelectElement>('[name="species"]')?.value).toBe(
      "Cat",
    );
    expect(container.querySelector<HTMLSelectElement>('[name="breed"]')?.value).toBe(
      "Siamese",
    );
    expect(
      container.querySelector<HTMLTextAreaElement>('[name="description"]')
        ?.value,
    ).toBe("Synthetic spotting details");
    expect(
      container.querySelector<HTMLInputElement>('[name="latitude"]')?.value,
    ).toBe("40.7");
    expect(
      container.querySelector<HTMLInputElement>('[name="longitude"]')?.value,
    ).toBe("-74");
    expect(
      container.querySelector<HTMLInputElement>('[name="locationLabel"]')
        ?.value,
    ).toBe("Local Park");
  });
});
