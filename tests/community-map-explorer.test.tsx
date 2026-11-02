/** @jest-environment jsdom */

import { act, createElement } from "react";
import type { Root } from "react-dom/client";

import { CommunityMapExplorer } from "@/components/community-map-explorer";
import { createDomRoot } from "./helpers/dom";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => null,
}));
jest.mock("@/app/page.module.css", () =>
  new Proxy({}, { get: (_target, property) => property }),
);

type SearchResponse = { ok: boolean; json: () => Promise<unknown> };

describe("CommunityMapExplorer location search", () => {
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

  it("keeps the newest location result when an earlier request is aborted", async () => {
    const requests: Array<{
      signal: AbortSignal | undefined;
      resolve: (response: SearchResponse) => void;
    }> = [];
    const fetchMock = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<SearchResponse>((resolve, reject) => {
        const signal = init?.signal ?? undefined;
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
        requests.push({ signal, resolve });
      });
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    await act(async () => {
      root.render(createElement(CommunityMapExplorer));
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Search a neighborhood or address"]',
    );
    const form = container.querySelector("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    const submit = async (query: string) => {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, query);
        input?.dispatchEvent(new Event("input", { bubbles: true }));
        form?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      });
    };

    await submit("Brooklyn");
    await submit("Queens");

    expect(requests).toHaveLength(2);
    const [earlierRequest, latestRequest] = requests;
    if (!earlierRequest || !latestRequest) {
      throw new Error("Expected both location search requests.");
    }
    expect(earlierRequest.signal?.aborted).toBe(true);

    await act(async () => {
      latestRequest.resolve(
        {
          ok: true,
          json: async () => [
            {
              latitude: 40.7282,
              longitude: -73.7949,
              label: "Queens, New York",
            },
          ],
        },
      );
    });

    expect(container.textContent).toContain("Queens, New York");
    expect(container.textContent).not.toContain("Brooklyn, New York");
  });
});
