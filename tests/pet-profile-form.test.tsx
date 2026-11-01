/** @jest-environment jsdom */

import { act, createElement } from "react";
import type { Root } from "react-dom/client";

import { PetProfileForm } from "@/components/pet-profile-form";
import type { PetProfileAction } from "@/features/pets/form-state";
import { createDomRoot } from "./helpers/dom";

jest.mock("next/image", () => ({ __esModule: true, default: () => null }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    <a href={href}>{children}</a>,
}));

describe("PetProfileForm", () => {
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

  it("shows validation feedback and retains text entries after submission", async () => {
    const action: PetProfileAction = async (previous, formData) => ({
      kind: "error",
      message: "Enter an age from 0 to 200.",
      values: {
        name: String(formData.get("name") ?? ""),
        species: String(formData.get("species") ?? ""),
        breed: String(formData.get("breed") ?? ""),
        color: String(formData.get("color") ?? ""),
        size: String(formData.get("size") ?? ""),
        age: String(formData.get("age") ?? ""),
        dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
        description: String(formData.get("description") ?? ""),
      },
      submission: previous.submission + 1,
    });

    await act(async () => {
      root.render(
        createElement(PetProfileForm, {
          action,
          pet: null,
          imageUrl: null,
          editing: false,
          cancelHref: "/pets",
          submitLabel: "Create Pet Profile",
        }),
      );
    });

    const name = container.querySelector<HTMLInputElement>('input[name="name"]');
    const age = container.querySelector<HTMLInputElement>('input[name="age"]');
    const form = container.querySelector("form");
    expect(name).not.toBeNull();
    expect(age).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setValue?.call(name, "Luna");
      setValue?.call(age, "201");
      name?.dispatchEvent(new Event("input", { bubbles: true }));
      age?.dispatchEvent(new Event("input", { bubbles: true }));
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe(
      "Luna",
    );
    expect(container.querySelector<HTMLInputElement>('input[name="age"]')?.value).toBe(
      "201",
    );
    expect(container.textContent).toContain("Enter an age from 0 to 200.");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
