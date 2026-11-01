import "server-only";

import {
  ensureApplicationUserRecord,
  findApplicationUser,
  updateApplicationUserDisplayName,
} from "./repository";
import type { AuthenticatedIdentity } from "./types";

export async function ensureApplicationUser(identity: AuthenticatedIdentity) {
  const emailName = identity.email.split("@")[0]?.slice(0, 100);
  const displayName =
    identity.displayName?.trim().slice(0, 100) ||
    emailName ||
    "MaxFinder member";

  await ensureApplicationUserRecord({
    authProviderId: identity.authProviderId,
    email: identity.email,
    displayName,
  });
}

export function getCurrentApplicationUser(authProviderId: string) {
  return findApplicationUser(authProviderId);
}

export function updateApplicationDisplayName(
  identity: AuthenticatedIdentity,
  displayName: string,
) {
  return updateApplicationUserDisplayName({
    authProviderId: identity.authProviderId,
    email: identity.email,
    displayName,
  });
}
