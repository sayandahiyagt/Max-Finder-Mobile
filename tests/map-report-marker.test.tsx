import {
  createElement,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MapReportMarker } from "@/components/map-report-marker";
import type { MapReport } from "@/features/search/types";

jest.mock("react-leaflet", () => ({
  CircleMarker: ({
    children,
    radius,
    fillColor,
  }: {
    children: ReactNode;
    radius: number;
    fillColor: string;
  }) => (
    <div data-radius={radius} data-fill-color={fillColor}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <span role="img" aria-label={alt} data-src={src} />
  ),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props} />
  ),
}));

function mapReport(type: MapReport["type"], id: string): MapReport {
  return {
    id,
    type,
    name: type === "lost" ? "Mochi" : "",
    species: "Cat",
    breed: "Domestic Shorthair",
    locationLabel: "Example Park",
    imageUrl: "http://127.0.0.1:54321/storage/v1/object/dummy.png",
    timestamp: "2026-10-20T18:30:00.000Z",
    position: [40.7128, -74.006],
  };
}

const linkCases = [
  {
    type: "lost",
    id: "report-1",
    href: "/lost-pets/reports/report-1",
    label: "Lost pet",
  },
  {
    type: "spotted",
    id: "spotting-1",
    href: "/spottings/spotting-1",
    label: "Spotting",
  },
] satisfies Array<{
  type: MapReport["type"];
  id: string;
  href: string;
  label: string;
}>;

describe("MapReportMarker", () => {
  it.each(linkCases)(
    "renders the $type detail link",
    ({ type, id, href, label }) => {
      const html = renderToStaticMarkup(
        createElement(MapReportMarker, { report: mapReport(type, id), zoom: 14 }),
      );

      expect(html).toContain(`href="${href}"`);
      expect(html).toContain(`popup-badge ${type}`);
      expect(html).toContain(label);
      expect(html).toContain('dateTime="2026-10-20T18:30:00.000Z"');
      expect(html).toContain("2026-10-20T18:30:00.000Z");
      expect(html).toContain("data-src=");
      expect(html).toContain("dummy.png");
    },
  );

  it("keeps dots small at country zoom and scales them up nearby", () => {
    const countryView = renderToStaticMarkup(
      createElement(MapReportMarker, {
        report: mapReport("spotted", "spotting-zoom"),
        zoom: 4,
      }),
    );
    const neighborhoodView = renderToStaticMarkup(
      createElement(MapReportMarker, {
        report: mapReport("spotted", "spotting-zoom"),
        zoom: 14,
      }),
    );

    expect(countryView).toContain('data-radius="1.5"');
    expect(neighborhoodView).toContain('data-radius="5"');
  });

  it("uses red for lost reports and blue for Spottings", () => {
    const lostReport = renderToStaticMarkup(
      createElement(MapReportMarker, {
        report: mapReport("lost", "lost-color"),
        zoom: 8,
      }),
    );
    const spotting = renderToStaticMarkup(
      createElement(MapReportMarker, {
        report: mapReport("spotted", "spotting-color"),
        zoom: 8,
      }),
    );

    expect(lostReport).toContain('data-fill-color="#ef4444"');
    expect(spotting).toContain('data-fill-color="#4f94d0"');
  });
});
