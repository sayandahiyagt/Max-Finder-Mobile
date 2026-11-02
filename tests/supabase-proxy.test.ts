import { NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/proxy";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));
jest.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    url: "http://127.0.0.1:54321",
    anonKey: "local-test-key",
  }),
}));

describe("updateSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("forwards refreshed cookies and cache headers to the response", async () => {
    jest.mocked(createServerClient).mockImplementation(
      (_url, _key, options) =>
        ({
          auth: {
            getClaims: async () => {
              const setAll = options.cookies.setAll;
              if (!setAll) throw new Error("Cookie writes are not configured.");
              setAll(
                [
                  {
                    name: "sb-local-auth-token",
                    value: "refreshed",
                    options: { path: "/", httpOnly: true },
                  },
                ],
                {
                  "cache-control": "private, no-store",
                  expires: "0",
                  pragma: "no-cache",
                },
              );
              return { data: { claims: { sub: "local-user" } }, error: null };
            },
          },
        }) as never,
    );

    const response = await updateSession(new NextRequest("http://localhost/"));

    expect(response.cookies.get("sb-local-auth-token")?.value).toBe(
      "refreshed",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
