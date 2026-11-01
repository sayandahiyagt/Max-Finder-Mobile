/** @jest-environment jsdom */

import { act, createElement } from "react";
import type { Root } from "react-dom/client";

import { LostPetReportForm } from "@/components/lost-pet-report-form";
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
      <input name="lastSeenAt" defaultValue={initialValues?.dateTime} />
      <input
        name="lastSeenAtTimezoneOffset"
        defaultValue={initialValues?.timezoneOffset}
      />
      <input name="locationLabel" defaultValue={initialValues?.locationLabel} />
      <input name="latitude" defaultValue={initialValues?.latitude} />
      <input name="longitude" defaultValue={initialValues?.longitude} />
    </>
  ),
}));
jest.mock("@/app/lost-pets/actions", () => ({
  createLostPetReport: async (
    previous: { submission: number },
    formData: FormData,
  ) => ({
    kind: "error",
    message: "Please complete every report field.",
    values: Object.fromEntries(formData),
    submission: previous.submission + 1,
  }),
}));

describe("LostPetReportForm", () => {
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

  it("shows inline feedback and retains text, date, and selected location", async () => {
    await act(async () => {
      root.render(
        createElement(LostPetReportForm, {
          pets: [
            {
              id: "local-pet",
              name: "Mochi",
              species: "cat",
              breed: null,
            },
          ],
        }),
      );
    });

    const description = container.querySelector<HTMLTextAreaElement>(
      '[name="description"]',
    );
    const date = container.querySelector<HTMLInputElement>(
      '[name="lastSeenAt"]',
    );
    const latitude = container.querySelector<HTMLInputElement>(
      '[name="latitude"]',
    );
    const longitude = container.querySelector<HTMLInputElement>(
      '[name="longitude"]',
    );
    const location = container.querySelector<HTMLInputElement>(
      '[name="locationLabel"]',
    );
    const form = container.querySelector("form");

    await act(async () => {
      const textAreaSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      textAreaSetter?.call(description, "Synthetic report description");
      description?.dispatchEvent(new Event("input", { bubbles: true }));
      for (const [element, value] of [
        [date, "2026-10-30T12:00"],
        [latitude, "40.7"],
        [longitude, "-74"],
        [location, "Local Park"],
      ] as const) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(element, value);
        element?.dispatchEvent(new Event("input", { bubbles: true }));
      }
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Please complete every report field.",
    );
    expect(
      container.querySelector<HTMLTextAreaElement>('[name="description"]')
        ?.value,
    ).toBe("Synthetic report description");
    expect(
      container.querySelector<HTMLInputElement>('[name="lastSeenAt"]')?.value,
    ).toBe("2026-10-30T12:00");
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
