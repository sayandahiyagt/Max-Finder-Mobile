import { getSupabaseConfig } from "@/lib/supabase/config";

describe("getSupabaseConfig", () => {
  it("returns the public Supabase configuration", () => {
    expect(
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "public-anon-key",
    });
  });

  it("fails clearly when required configuration is missing", () => {
    expect(() => getSupabaseConfig({})).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });
});
