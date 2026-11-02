/** @jest-environment jsdom */

import { act, createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { LocalizedDateTime } from "@/components/localized-date-time";

describe("LocalizedDateTime", () => {
  it("formats an ISO instant in the browser locale", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
    });
    const container = document.createElement("div");
    const value = "2026-10-30T17:00:00.000Z";
    const element = createElement(LocalizedDateTime, { value });
    container.innerHTML = renderToString(element);
    let root: ReturnType<typeof hydrateRoot>;

    await act(async () => {
      root = hydrateRoot(container, element);
    });

    const time = container.querySelector("time");
    expect(time?.dateTime).toBe(value);
    expect(time?.textContent).toBe(new Date(value).toLocaleString());

    await act(async () => root.unmount());
  });

  it("supports date-only displays", async () => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
    });
    const container = document.createElement("div");
    const value = "2026-10-30T17:00:00.000Z";
    const element = createElement(LocalizedDateTime, { value, dateOnly: true });
    container.innerHTML = renderToString(element);
    let root: ReturnType<typeof hydrateRoot>;

    await act(async () => {
      root = hydrateRoot(container, element);
    });

    expect(container.querySelector("time")?.textContent).toBe(
      new Date(value).toLocaleDateString(),
    );

    await act(async () => root.unmount());
  });
});
