import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LocationDateFields } from "@/components/location-date-fields";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));

describe("LocationDateFields", () => {
  it("uses the spotting date field by default", () => {
    const html = renderToStaticMarkup(createElement(LocationDateFields, {}));

    expect(html).toContain("Date and time spotted");
    expect(html).toContain('name="spottedAt"');
  });

  it("supports the lost report date field", () => {
    const html = renderToStaticMarkup(
      createElement(LocationDateFields, {
        dateName: "lastSeenAt",
        dateLabel: "Last seen date and time",
      }),
    );

    expect(html).toContain("Last seen date and time");
    expect(html).toContain('name="lastSeenAt"');
  });
});
