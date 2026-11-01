/** @jest-environment jsdom */

import { act, createElement } from "react";
import type { Root } from "react-dom/client";

import { PetProfileDeleteForm } from "@/components/pet-profile-delete-form";
import { createDomRoot } from "./helpers/dom";

jest.mock("@/app/pets/actions", () => ({
  deletePet: async (previous: { submission: number }) => ({
    kind: "error",
    message: "This Pet Profile cannot be deleted while a Lost Pet Report uses it.",
    submission: previous.submission + 1,
  }),
}));

describe("PetProfileDeleteForm", () => {
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

  it("shows the deletion constraint inline after submission", async () => {
    await act(async () => {
      root.render(createElement(PetProfileDeleteForm, { petId: "local-pet" }));
    });

    const form = container.querySelector("form");
    expect(form?.querySelector('[name="petId"]')).not.toBeNull();

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "cannot be deleted while a Lost Pet Report uses it",
    );
  });
});
