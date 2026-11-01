import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import NotFound from "@/app/not-found";

describe("not-found page", () => {
  it("provides a clear message and a route back to the map", () => {
    const markup = renderToStaticMarkup(createElement(NotFound));

    expect(markup).toContain("We couldn’t find that page");
    expect(markup).toContain('href="/"');
    expect(markup).toContain("Back to map");
  });
});
