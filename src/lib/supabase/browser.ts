import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
