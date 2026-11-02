/** @jest-environment jsdom */

import { act, createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { CurrentDateTimeInput } from "@/components/current-date-time-input";

describe("CurrentDateTimeInput", () => {
  it("initializes in the browser timezone and submits its offset", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
    });
    const container = document.createElement("div");
    const element = createElement(CurrentDateTimeInput, {
      name: "lastSeenAt",
      label: "Last seen date and time",
    });
    container.innerHTML = renderToString(element);
    let root: ReturnType<typeof hydrateRoot>;

    await act(async () => {
      root = hydrateRoot(container, element);
    });

    const input = container.querySelector<HTMLInputElement>(
      'input[name="lastSeenAt"]',
    );
    const offset = container.querySelector<HTMLInputElement>(
      'input[name="lastSeenAtTimezoneOffset"]',
    );
    expect(input?.type).toBe("datetime-local");
    expect(input?.required).toBe(true);
    expect(input?.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(offset?.value).toBe(
      String(new Date(input?.value ?? "").getTimezoneOffset()),
    );

    await act(async () => root.unmount());
  });

  it("restores the submitted local time and original offset after an error", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
    });
    const container = document.createElement("div");
    const element = createElement(CurrentDateTimeInput, {
      name: "lastSeenAt",
      label: "Last seen date and time",
      initialValue: "2026-10-30T12:00",
      initialTimezoneOffset: "300",
    });
    container.innerHTML = renderToString(element);
    let root: ReturnType<typeof hydrateRoot>;

    await act(async () => {
      root = hydrateRoot(container, element);
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="lastSeenAt"]')
        ?.value,
    ).toBe("2026-10-30T12:00");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="lastSeenAtTimezoneOffset"]',
      )?.value,
    ).toBe("300");

    await act(async () => root.unmount());
  });
});
