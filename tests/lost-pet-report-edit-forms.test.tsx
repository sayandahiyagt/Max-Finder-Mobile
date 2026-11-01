/** @jest-environment jsdom */

import { act, createElement } from "react";
import type { Root } from "react-dom/client";

import { LostPetReportRemovalForm } from "@/components/lost-pet-report-removal-form";
import { LostPetReportUpdateForm } from "@/components/lost-pet-report-update-form";
import { createDomRoot } from "./helpers/dom";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));
jest.mock("@/app/lost-pets/actions", () => ({
  updateLostPet: async (
    previous: { submission: number },
    formData: FormData,
  ) => ({
    kind: "error",
    message: "Report could not be updated. Please try again.",
    values: {
      id: String(formData.get("id") ?? ""),
      status: String(formData.get("status") ?? ""),
      description: String(formData.get("description") ?? ""),
    },
    submission: previous.submission + 1,
  }),
  deleteLostPet: async (previous: { submission: number }) => ({
    kind: "error",
    message: "Report could not be removed. Refresh and try again.",
    submission: previous.submission + 1,
  }),
}));

describe("Lost Pet Report edit forms", () => {
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

  it("shows update errors and retains the selected status and description", async () => {
    await act(async () => {
      root.render(
        createElement(LostPetReportUpdateForm, {
          id: "local-report",
          status: "LOST",
          description: "Initial details",
        }),
      );
    });

    const status = container.querySelector<HTMLSelectElement>(
      '[name="status"]',
    );
    const description = container.querySelector<HTMLTextAreaElement>(
      '[name="description"]',
    );
    const form = container.querySelector("form");

    await act(async () => {
      if (status) status.value = "FOUND";
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(description, "Updated synthetic details");
      description?.dispatchEvent(new Event("input", { bubbles: true }));
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Report could not be updated.",
    );
    expect(container.querySelector<HTMLSelectElement>('[name="status"]')?.value).toBe(
      "FOUND",
    );
    expect(
      container.querySelector<HTMLTextAreaElement>('[name="description"]')
        ?.value,
    ).toBe("Updated synthetic details");
  });

  it("shows removal errors inline while retaining the report", async () => {
    await act(async () => {
      root.render(
        createElement(LostPetReportRemovalForm, { id: "local-report" }),
      );
    });

    const form = container.querySelector("form");
    expect(form?.querySelector<HTMLInputElement>('[name="id"]')?.value).toBe(
      "local-report",
    );

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Report could not be removed.",
    );
  });
});
