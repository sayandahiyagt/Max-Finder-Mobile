import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ApplicationError from "@/app/error";

describe("application error boundary", () => {
  it("shows safe recovery actions without rendering internal error details", () => {
    const markup = renderToStaticMarkup(
      createElement(ApplicationError, {
        error: new Error("database connection string"),
        retry: () => undefined,
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Try again");
    expect(markup).toContain('href="/"');
    expect(markup).not.toContain("database connection string");
  });
});
