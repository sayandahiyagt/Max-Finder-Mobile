/** @jest-environment jsdom */

import { act, createElement, type ReactNode } from "react";
import type { Root } from "react-dom/client";

import MapExplorer from "@/components/map-explorer";
import { createDomRoot } from "./helpers/dom";
import { dummyMapActivity, dummySpotting } from "./fixtures/dummy-data";

jest.mock("leaflet/dist/leaflet.css", () => ({}));
jest.mock("react-leaflet", () => {
  const container = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );

  return {
    Circle: container,
    CircleMarker: container,
    MapContainer: container,
    Marker: container,
    Popup: container,
    TileLayer: container,
    useMap: () => ({ invalidateSize: jest.fn(), setView: jest.fn() }),
    useMapEvents: jest.fn(),
  };
});
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span role="img" aria-label={alt} data-src={src} />
  ),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children?: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("MapExplorer", () => {
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
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("reports empty counts once when map activity cannot load", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    const onCountsChange = jest.fn();

    await act(async () => {
      root.render(createElement(MapExplorer, { onCountsChange }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain(
      "Map activity could not be loaded. Try again shortly.",
    );
    expect(onCountsChange).toHaveBeenCalledTimes(1);
    expect(onCountsChange).toHaveBeenCalledWith({ reports: 0, spottings: 0 });
  });

  it("sends selected filters and radius, then renders the Spotting detail link", async () => {
    const spotting = dummyMapActivity.spottings[0];
    if (!spotting) throw new Error("Expected a synthetic Spotting pin.");
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [], spottings: [spotting] }),
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    await act(async () => {
      root.render(
        createElement(MapExplorer, {
          filters: {
            activityType: "spotted",
            species: "Cat",
            breed: "Siamese",
            timeRange: "7",
          },
          searchLocation: [40.7282, -73.7949],
          radiusMiles: 5,
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] ?? [];
    const params = new URL(String(url), "http://localhost").searchParams;
    expect(params.get("activityType")).toBe("spotted");
    expect(params.get("species")).toBe("Cat");
    expect(params.get("breed")).toBe("Siamese");
    expect(params.get("timeRangeDays")).toBe("7");
    expect(params.get("centerLatitude")).toBe("40.7282");
    expect(params.get("centerLongitude")).toBe("-73.7949");
    expect(params.get("radiusMiles")).toBe("5");
    expect(params.has("minLat")).toBe(true);
    expect(
      container.querySelector(
        `a[href="/spottings/${dummySpotting.id}"]`,
      ),
    ).not.toBeNull();
  });
});
