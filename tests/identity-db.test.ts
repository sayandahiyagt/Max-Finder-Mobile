jest.mock("server-only", () => ({}), { virtual: true });

import { getPrismaClient } from "@/lib/db/client";
import { dummyUsers } from "./fixtures/dummy-data";
import { findApplicationUser } from "@/features/identity/repository";
import {
  ensureApplicationUser,
  updateApplicationDisplayName,
} from "@/features/identity/application";
import { isLocalDatabase } from "./helpers/local-environment";

(isLocalDatabase ? describe : describe.skip)(
  "application identity database",
  () => {
    afterAll(async () => {
      await getPrismaClient().$disconnect();
    });

    it("syncs email without replacing the application display name or role", async () => {
      const identity = {
        authProviderId: dummyUsers.owner.authProviderId,
        email: "owner@example.test",
        displayName: "Riley Owner",
      };

      try {
        await ensureApplicationUser(identity);
        await updateApplicationDisplayName(identity, "Riley's chosen name");
        await ensureApplicationUser({
          ...identity,
          email: "owner.updated@example.test",
          displayName: "Stale provider metadata",
        });

        const user = await findApplicationUser(identity.authProviderId);
        expect(user).toMatchObject({
          authProviderId: identity.authProviderId,
          email: "owner.updated@example.test",
          displayName: "Riley's chosen name",
          role: "USER",
        });
        expect(
          await getPrismaClient().user.count({
            where: { authProviderId: identity.authProviderId },
          }),
        ).toBe(1);
        expect(
          await findApplicationUser(dummyUsers.admin.authProviderId),
        ).toMatchObject({ role: "ADMIN", email: "admin@example.test" });
        expect(await getPrismaClient().user.count()).toBe(3);
      } finally {
        await ensureApplicationUser(identity);
        await updateApplicationDisplayName(identity, identity.displayName);
      }
    });
  },
);
