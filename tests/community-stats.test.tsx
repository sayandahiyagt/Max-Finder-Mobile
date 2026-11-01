import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CommunityStats,
  CommunityStatsLoading,
} from "@/components/community-stats";
import { dummyCommunityActivityCounts } from "./fixtures/dummy-data";

jest.mock("@/app/page.module.css", () =>
  new Proxy({}, { get: (_target, property) => property }),
);

describe("community statistics", () => {
  it("renders the synthetic counts", () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityStats, { stats: dummyCommunityActivityCounts }),
    );

    expect(markup).toContain("2");
    expect(markup).toContain("1");
    expect(markup).toContain("3");
    expect(markup).toContain("Active lost pets");
  });

  it("shows an accessible failure status when counts are unavailable", () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityStats, { stats: null }),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Community statistics are temporarily unavailable.");
  });

  it("shows an accessible loading status", () => {
    const markup = renderToStaticMarkup(createElement(CommunityStatsLoading));

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading community statistics");
  });
});
