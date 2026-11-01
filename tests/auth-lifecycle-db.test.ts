import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { ensureApplicationUser } from "@/features/identity/application";
import { findApplicationUser } from "@/features/identity/repository";
import { getPrismaClient } from "@/lib/db/client";
import {
  isLocalDatabase,
  isLoopbackEndpoint,
} from "./helpers/local-environment";

jest.mock("server-only", () => ({}), { virtual: true });
const localConfig = (() => {
  const url = process.env.TEST_SUPABASE_URL;
  const publishableKey = process.env.TEST_SUPABASE_KEY;
  const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (
    !isLocalDatabase ||
    !url ||
    !isLoopbackEndpoint(url, "54321") ||
    !publishableKey ||
    !serviceRoleKey
  )
    return null;
  return { url, publishableKey, serviceRoleKey };
})();

(localConfig ? describe : describe.skip)("local Auth lifecycle", () => {
  it("registers, links, signs in, and signs out a synthetic account", async () => {
    if (!localConfig)
      throw new Error("Local Supabase configuration is required.");

    const authOptions = {
      auth: { autoRefreshToken: false, persistSession: false },
    };
    const account = createClient(
      localConfig.url,
      localConfig.publishableKey,
      authOptions,
    );
    const admin = createClient(
      localConfig.url,
      localConfig.serviceRoleKey,
      authOptions,
    );
    const email = `auth-${randomUUID()}@example.test`;
    const password = `local-${randomUUID()}-Password!`;
    const displayName = "Synthetic Auth Journey";
    let authProviderId: string | undefined;

    try {
      const registration = await account.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, role: "ADMIN" } },
      });
      if (registration.error || !registration.data.user) {
        throw new Error("Local Auth registration failed.");
      }
      authProviderId = registration.data.user.id;

      const identity = {
        authProviderId,
        email,
        displayName:
          typeof registration.data.user.user_metadata.display_name === "string"
            ? registration.data.user.user_metadata.display_name
            : null,
      };
      await ensureApplicationUser(identity);
      await expect(findApplicationUser(authProviderId)).resolves.toMatchObject({
        authProviderId,
        email,
        displayName,
        role: "USER",
      });

      await account.auth.signOut();
      const signIn = await account.auth.signInWithPassword({ email, password });
      expect(signIn.error).toBeNull();
      expect(signIn.data.user?.id).toBe(authProviderId);
      if (signIn.error || !signIn.data.session)
        throw new Error("Local Auth sign-in did not return a session.");

      const refreshed = await account.auth.refreshSession({
        refresh_token: signIn.data.session.refresh_token,
      });
      expect(refreshed.error).toBeNull();
      expect(refreshed.data.session?.user.id).toBe(authProviderId);
      expect(refreshed.data.session?.access_token).not.toBe(
        signIn.data.session.access_token,
      );

      const signOut = await account.auth.signOut();
      expect(signOut.error).toBeNull();
      const session = await account.auth.getUser();
      expect(session.data.user).toBeNull();
    } finally {
      try {
        if (authProviderId) {
          const deletion = await admin.auth.admin.deleteUser(authProviderId);
          if (deletion.error) throw new Error("Local Auth cleanup failed.");
        }
      } finally {
        await getPrismaClient().$disconnect();
      }
    }
  });
});
