import "server-only";

import { getPrismaClient } from "@/lib/db/client";

export type ApplicationUserInput = {
  authProviderId: string;
  email: string;
  displayName: string;
};

export function ensureApplicationUserRecord(input: ApplicationUserInput) {
  return getPrismaClient().user.upsert({
    where: { authProviderId: input.authProviderId },
    create: input,
    update: { email: input.email },
  });
}

export function updateApplicationUserDisplayName(input: ApplicationUserInput) {
  return getPrismaClient().user.upsert({
    where: { authProviderId: input.authProviderId },
    create: input,
    update: { email: input.email, displayName: input.displayName },
  });
}

export function findApplicationUser(authProviderId: string) {
  return getPrismaClient().user.findUnique({
    where: { authProviderId },
    select: {
      userId: true,
      authProviderId: true,
      email: true,
      displayName: true,
      role: true,
    },
  });
}
