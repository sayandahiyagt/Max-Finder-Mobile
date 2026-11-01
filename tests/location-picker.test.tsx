/** @jest-environment jsdom */

import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Root } from "react-dom/client";
import L from "leaflet";

import { LocationPickerFields } from "@/components/location-picker";
import { getCurrentDeviceLocation } from "@/lib/geolocation";
import { createDomRoot } from "./helpers/dom";

type MapEvents = {
  click: (event: { latlng: { lat: number; lng: number } }) => void;
};
type MarkerEvents = {
  dragend: (event: { target: L.Marker }) => void;
};
type GeocodeResponse = { ok: boolean; json: () => Promise<unknown> };

const mockMapEvents: { current: MapEvents | undefined } = { current: undefined };
const mockMarkerEvents: { current: MarkerEvents | undefined } = {
  current: undefined,
};
const mockMap = { getZoom: () => 14, setView: jest.fn() };

jest.mock("leaflet", () => ({
  __esModule: true,
  default: {
    divIcon: jest.fn(() => ({})),
    Marker: class Marker {
      constructor(private readonly position: [number, number]) {}

      getLatLng() {
        return { lat: this.position[0], lng: this.position[1] };
      }
    },
  },
}));
jest.mock("leaflet/dist/leaflet.css", () => ({}), { virtual: true });
jest.mock("react-leaflet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    MapContainer: ({ children }: { children: import("react").ReactNode }) =>
      createElement("div", null, children),
    Marker: ({ eventHandlers }: { eventHandlers: MarkerEvents }) => {
      mockMarkerEvents.current = eventHandlers;
      return null;
    },
    TileLayer: () => null,
    useMap: () => mockMap,
    useMapEvents: (events: MapEvents) => {
      mockMapEvents.current = events;
    },
  };
});
jest.mock("@/lib/geolocation", () => ({
  getCurrentDeviceLocation: jest.fn(),
}));

describe("LocationPickerFields", () => {
  let root: Root;
  let container: HTMLDivElement;
  let cleanup: () => Promise<void>;

  beforeEach(() => {
    const dom = createDomRoot();
    container = dom.container;
    root = dom.root;
    cleanup = dom.cleanup;
    mockMapEvents.current = undefined;
    mockMarkerEvents.current = undefined;
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "fetch");
  });

  function mockGeocoder(label: string) {
    const fetchMock = jest.fn((): Promise<GeocodeResponse> =>
      Promise.resolve({ ok: true, json: async () => ({ label }) }),
    );
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    return fetchMock;
  }

  async function renderPicker() {
    await act(async () => {
      root.render(createElement(LocationPickerFields));
    });
  }

  it("starts without coordinates and offers explicit map and device choices", () => {
    const markup = renderToStaticMarkup(
      createElement(LocationPickerFields),
    );

    expect(markup).toContain("Choose a point on the map.");
    expect(markup).toContain("Use my current location");
    expect(markup).toMatch(/type="hidden"[^>]+name="latitude" value=""/);
    expect(markup).toMatch(/type="hidden"[^>]+name="longitude" value=""/);
  });

  it("restores a submitted point and label after a form error", async () => {
    await act(async () => {
      root.render(
        createElement(LocationPickerFields, {
          initialLocationLabel: "Local Park",
          initialLatitude: "40.7",
          initialLongitude: "-74",
        }),
      );
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("40.7");
    expect(
      container.querySelector<HTMLInputElement>('input[name="longitude"]')
        ?.value,
    ).toBe("-74");
    expect(
      container.querySelector<HTMLInputElement>('input[name="locationLabel"]')
        ?.value,
    ).toBe("Local Park");
  });

  it("stores the clicked map point and resolves its address locally", async () => {
    const fetchMock = mockGeocoder("Example Park, Example City");
    await renderPicker();

    await act(async () => {
      mockMapEvents.current?.click({ latlng: { lat: 40.7128, lng: -74.006 } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("40.7128");
    expect(
      container.querySelector<HTMLInputElement>('input[name="longitude"]')
        ?.value,
    ).toBe("-74.006");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="locationLabel"]',
      )?.value,
    ).toBe("Example Park, Example City");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/geocode?lat=40.7128&lon=-74.006",
    );
  });

  it("updates coordinates and address when the selected marker is dragged", async () => {
    const fetchMock = mockGeocoder("Dragged location address");
    await renderPicker();

    await act(async () => {
      mockMapEvents.current?.click({ latlng: { lat: 40.7128, lng: -74.006 } });
    });

    await act(async () => {
      mockMarkerEvents.current?.dragend({
        target: new L.Marker([40.8, -73.9]),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("40.8");
    expect(
      container.querySelector<HTMLInputElement>('input[name="longitude"]')
        ?.value,
    ).toBe("-73.9");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="locationLabel"]',
      )?.value,
    ).toBe("Dragged location address");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/geocode?lat=40.8&lon=-73.9",
    );
  });

  it("keeps the latest address when reverse-geocode responses arrive out of order", async () => {
    const requests: Array<{
      url: string;
      resolve: (response: GeocodeResponse) => void;
    }> = [];
    const fetchMock = jest.fn(
      (input: RequestInfo | URL): Promise<GeocodeResponse> =>
        new Promise((resolve) =>
          requests.push({ url: String(input), resolve }),
        ),
    );
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });
    await renderPicker();

    await act(async () => {
      mockMapEvents.current?.click({ latlng: { lat: 40.7, lng: -74 } });
    });
    await act(async () => {
      mockMapEvents.current?.click({ latlng: { lat: 40.8, lng: -73.9 } });
    });

    expect(requests.map(({ url }) => url)).toEqual([
      "/api/geocode?lat=40.7&lon=-74",
      "/api/geocode?lat=40.8&lon=-73.9",
    ]);
    const [earlierRequest, latestRequest] = requests;
    if (!earlierRequest || !latestRequest) {
      throw new Error("Expected both reverse-geocode requests.");
    }

    await act(async () => {
      latestRequest.resolve({
        ok: true,
        json: async () => ({ label: "Latest map location" }),
      });
    });
    await act(async () => {
      earlierRequest.resolve({
        ok: true,
        json: async () => ({ label: "Earlier map location" }),
      });
    });

    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="locationLabel"]',
      )?.value,
    ).toBe("Latest map location");
    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("40.8");
  });

  it("uses device coordinates after an explicit request", async () => {
    const fetchMock = mockGeocoder("Device location label");
    jest
      .mocked(getCurrentDeviceLocation)
      .mockResolvedValue([40.7, -74]);
    await renderPicker();
    const button = container.querySelector("button");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getCurrentDeviceLocation).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("40.7");
    expect(
      container.querySelector<HTMLInputElement>('input[name="longitude"]')
        ?.value,
    ).toBe("-74");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps manual map selection available when device location is denied", async () => {
    const fetchMock = mockGeocoder("Unused address");
    jest
      .mocked(getCurrentDeviceLocation)
      .mockRejectedValue(new Error("Location unavailable."));
    await renderPicker();
    const button = container.querySelector("button");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain(
      "Could not get device location. Select a map point instead.",
    );
    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      mockMapEvents.current?.click({ latlng: { lat: 40.7, lng: -74 } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="latitude"]')
        ?.value,
    ).toBe("40.7");
  });
});
