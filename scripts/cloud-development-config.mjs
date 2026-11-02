import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

export const developmentProjectRef = "vkdfgxvdbhmymjkrycif";
export const cloudEnvironmentFile = ".env.cloud-development";
export const developmentApiUrl = `https://${developmentProjectRef}.supabase.co`;
export const developmentCaCertificate = resolve(".supabase/development-ca.crt");

export function readCloudEnvironment() {
  try {
    return parseEnv(readFileSync(cloudEnvironmentFile, "utf8"));
  } catch {
    throw new Error(`Create ignored ${cloudEnvironmentFile} with the development DATABASE_URL first.`);
  }
}

export function validateDevelopmentDatabase(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid development DATABASE_URL."); }
  const direct = url.hostname === `db.${developmentProjectRef}.supabase.co`;
  const pooled = /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)
    && decodeURIComponent(url.username).endsWith(`.${developmentProjectRef}`);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || (!direct && !pooled) || !url.password) {
    throw new Error("DATABASE_URL must target the approved hosted development project and include its password.");
  }
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode && !["require", "verify-ca", "verify-full"].includes(sslmode)) {
    throw new Error("The development database connection must use TLS.");
  }
  url.searchParams.set("sslmode", "verify-full");
  if (url.searchParams.has("sslrootcert") && resolve(url.searchParams.get("sslrootcert")) !== developmentCaCertificate) {
    throw new Error("Use the development project's CA certificate at .supabase/development-ca.crt.");
  }
  url.searchParams.set("sslrootcert", developmentCaCertificate);
  return url.href;
}

export function validatedCloudEnvironment() {
  const env = readCloudEnvironment();
  if (env.NEXT_PUBLIC_SUPABASE_URL !== developmentApiUrl || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Run npm run cloud:configure to configure the development project's Auth and Storage keys.");
  }
  try { readFileSync(developmentCaCertificate); } catch {
    throw new Error("Download the development project's database CA certificate to .supabase/development-ca.crt first.");
  }
  return {
    DATABASE_URL: validateDevelopmentDatabase(env.DATABASE_URL),
    NEXT_PUBLIC_SUPABASE_URL: developmentApiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
