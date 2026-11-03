import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const developmentProjectRef = "vkdfgxvdbhmymjkrycif";
export const developmentApiUrl = `https://${developmentProjectRef}.supabase.co`;
export const developmentMediaEnvironmentFile = ".env.development-media";

export function readDevelopmentMediaEnvironment() {
  let environment;
  try {
    environment = parseEnv(readFileSync(developmentMediaEnvironmentFile, "utf8"));
  } catch {
    throw new Error(
      `Run npm run db:dev:media-configure to create ${developmentMediaEnvironmentFile}.`,
    );
  }
  if (
    environment.SUPABASE_URL !== developmentApiUrl ||
    !environment.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Development media credentials do not match the approved development project.",
    );
  }
  return environment;
}
