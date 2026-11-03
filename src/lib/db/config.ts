import type { PoolConfig } from "pg";

const projectRefs = {
  preview: "vkdfgxvdbhmymjkrycif",
  production: "zbxnmkeolrcpadwzkuhp",
} as const;

export function getDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  const connectionString = env.DATABASE_URL;
  if (!connectionString)
    throw new Error("Missing DATABASE_URL for the application database.");

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Invalid DATABASE_URL. Use a PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Invalid DATABASE_URL. Use a PostgreSQL connection URL.");
  }

  return connectionString;
}

export function getDatabasePoolConfig(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  const connectionString = getDatabaseUrl(env);
  const url = new URL(connectionString);

  if (!env.VERCEL_ENV) {
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.port !== "54322"
    ) {
      throw new Error(
        "Local app development must use the local Supabase database at 127.0.0.1:54322.",
      );
    }
    return { connectionString };
  }

  if (env.VERCEL_ENV === "development") {
    throw new Error("Vercel Development environment is not supported.");
  }
  if (env.VERCEL_ENV !== "preview" && env.VERCEL_ENV !== "production") {
    throw new Error("Unsupported Vercel database environment.");
  }

  const projectRef = projectRefs[env.VERCEL_ENV];
  const projectUrl = `https://${projectRef}.supabase.co`;
  const isProjectTransactionPooler =
    url.hostname.endsWith(".pooler.supabase.com") &&
    url.port === "6543" &&
    decodeURIComponent(url.username).endsWith(`.${projectRef}`);
  if (!isProjectTransactionPooler) {
    const stage = env.VERCEL_ENV === "preview" ? "development" : "production";
    throw new Error(
      `Vercel ${env.VERCEL_ENV} DATABASE_URL must use the ${stage} project's transaction pooler.`,
    );
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== projectUrl) {
    throw new Error(
      `Vercel ${env.VERCEL_ENV} Supabase URL must match project ${projectRef}.`,
    );
  }

  const caBase64 = env.SUPABASE_DB_CA_CERT_BASE64?.replace(/\s/g, "");
  if (!caBase64) {
    throw new Error("Missing SUPABASE_DB_CA_CERT_BASE64 for the database TLS connection.");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(caBase64)) {
    throw new Error("SUPABASE_DB_CA_CERT_BASE64 must contain a base64 CA certificate.");
  }
  const ca = Buffer.from(caBase64, "base64").toString("utf8");
  if (
    Buffer.from(ca).toString("base64") !== caBase64 ||
    !ca.includes("-----BEGIN CERTIFICATE-----") ||
    !ca.includes("-----END CERTIFICATE-----")
  ) {
    throw new Error("SUPABASE_DB_CA_CERT_BASE64 must contain a valid PEM certificate.");
  }

  for (const parameter of ["ssl", "sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    url.searchParams.delete(parameter);
  }
  return {
    connectionString: url.href,
    max: 1,
    ssl: { ca, rejectUnauthorized: true },
  };
}
