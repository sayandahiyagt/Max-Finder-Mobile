import { isLoopbackEndpoint } from "./helpers/local-environment";

describe("local test endpoint guard", () => {
  it.each([
    ["http://127.0.0.1:54321", "54321"],
    ["postgresql://localhost:54322/postgres", "54322"],
  ])("accepts loopback endpoint %s on port %s", (url, port) => {
    expect(isLoopbackEndpoint(url, port)).toBe(true);
  });

  it.each([
    ["https://project.supabase.co:54321", "54321"],
    ["http://127.0.0.1:54321", "54322"],
    ["not-a-url", "54321"],
    [undefined, "54321"],
  ])("rejects nonlocal endpoint %s on port %s", (url, port) => {
    expect(isLoopbackEndpoint(url, port)).toBe(false);
  });
});
