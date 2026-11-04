import nextEnv from "@next/env";
import { createChunks, createServerClient } from "@supabase/ssr";
import { assertLocalDockerContext } from "./helpers/local-docker-context.mjs";

assertLocalDockerContext();

nextEnv.loadEnvConfig(process.cwd());
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const appUrl = new URL(process.env.LOCAL_APP_URL ?? "http://127.0.0.1:3000");
if (!supabaseUrl || !supabaseKey || !databaseUrl) {
  process.stderr.write(
    "Local Supabase settings are missing. Run 'npm run db:configure'.\n",
  );
  process.exit(2);
}
const supabaseHost = new URL(supabaseUrl);
const databaseHost = new URL(databaseUrl);
if (
  supabaseHost.hostname !== "127.0.0.1" ||
  supabaseHost.port !== "54321" ||
  databaseHost.hostname !== "127.0.0.1" ||
  databaseHost.port !== "54322" ||
  appUrl.hostname !== "127.0.0.1"
) {
  process.stderr.write(
    "Refusing Auth smoke test unless Supabase and PostgreSQL use local ports.\n",
  );
  process.exit(2);
}

const cookieJar = new Map();
const anonymousIdentity = await fetch(new URL("/api/auth/me", appUrl));
if (anonymousIdentity.status !== 401) {
  process.stderr.write(
    `Anonymous identity endpoint returned ${anonymousIdentity.status}, expected 401.\n`,
  );
  process.exit(1);
}
const unboundedMap = await fetch(new URL("/api/map", appUrl));
if (unboundedMap.status !== 400) {
  process.stderr.write(
    `Map request without viewport bounds returned ${unboundedMap.status}, expected 400.\n`,
  );
  process.exit(1);
}
for (const path of ["/pets", "/messages"]) {
  const page = await fetch(new URL(path, appUrl), { redirect: "manual" });
  const redirectPath = page.headers.get("location");
  if (
    page.status !== 307 ||
    !redirectPath ||
    new URL(redirectPath, appUrl).pathname !== "/sign-in"
  ) {
    process.stderr.write(
      `Anonymous access to ${path} returned ${page.status} instead of redirecting to sign-in.\n`,
    );
    process.exit(1);
  }
}
for (const [path, content] of [
  ["/sign-in", "Sign in to MaxFinder"],
  ["/sign-up", "Create your account"],
]) {
  const page = await fetch(new URL(path, appUrl));
  if (page.status !== 200 || !(await page.text()).includes(content)) {
    process.stderr.write(`Authentication page failed to render: ${path}.\n`);
    process.exit(1);
  }
}

const supabase = createServerClient(supabaseUrl, supabaseKey, {
  cookies: {
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    setAll: (cookies) =>
      cookies.forEach(({ name, value }) => cookieJar.set(name, value)),
  },
});
const { data, error } = await supabase.auth.signInWithPassword({
  email: "owner@example.test",
  password: "local-only-test-password",
});
if (error || !data.user) {
  process.stderr.write(
    `Local seed account sign-in failed: ${error?.message ?? "no user returned"}.\n`,
  );
  process.exit(1);
}

const cookieHeader = [...cookieJar]
  .map(([name, value]) => `${name}=${value}`)
  .join("; ");
const response = await fetch(new URL("/api/auth/me", appUrl), {
  headers: { cookie: cookieHeader },
});
if (response.status !== 200) {
  process.stderr.write(
    `Authenticated identity endpoint returned ${response.status}.\n`,
  );
  process.exit(1);
}
const identity = await response.json();
if (identity.displayName !== "Riley Owner" || identity.role !== "USER") {
  process.stderr.write(
    "Authenticated identity endpoint returned the wrong local profile.\n",
  );
  process.exit(1);
}

function expiredSessionCookies(cookies) {
  const authCookieNames = [...cookies.keys()].filter((name) =>
    /-auth-token(?:\.\d+)?$/.test(name),
  );
  if (authCookieNames.length === 0) {
    throw new Error("Local sign-in did not produce an Auth session cookie.");
  }

  const baseNames = new Set(authCookieNames.map((name) => name.replace(/\.\d+$/, "")));
  if (baseNames.size !== 1) {
    throw new Error("Local sign-in produced multiple Auth session cookies.");
  }
  const baseName = [...baseNames][0];
  authCookieNames.sort((left, right) => {
    const index = (name) => Number(name.match(/\.(\d+)$/)?.[1] ?? -1);
    return index(left) - index(right);
  });
  const sessionCookie = authCookieNames
    .map((name) => cookies.get(name))
    .join("");
  if (!sessionCookie.startsWith("base64-")) {
    throw new Error("Local Auth session cookie encoding changed.");
  }

  const session = JSON.parse(
    Buffer.from(sessionCookie.slice("base64-".length), "base64url").toString(
      "utf8",
    ),
  );
  if (!session.refresh_token || !session.access_token) {
    throw new Error("Local Auth session cookie did not contain a session.");
  }
  session.expires_at = 1;

  const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const chunks = createChunks(baseName, encoded);
  authCookieNames.forEach((name) => cookies.delete(name));
  chunks.forEach(({ name, value }) => cookies.set(name, value));
  return cookies;
}

const expiredCookieJar = expiredSessionCookies(new Map(cookieJar));
const expiredCookieHeader = [...expiredCookieJar]
  .map(([name, value]) => `${name}=${value}`)
  .join("; ");
const refreshedIdentity = await fetch(new URL("/api/auth/me", appUrl), {
  headers: { cookie: expiredCookieHeader },
});
const refreshedCookies = refreshedIdentity.headers
  .getSetCookie()
  .map((cookie) => cookie.split(";", 1)[0])
  .map((cookie) => {
    const separator = cookie.indexOf("=");
    return [cookie.slice(0, separator), cookie.slice(separator + 1)];
  })
  .filter(([name]) => /-auth-token(?:\.\d+)?$/.test(name));
if (
  refreshedIdentity.status !== 200 ||
  !refreshedCookies.length ||
  !refreshedCookies.some(([name, value]) => expiredCookieJar.get(name) !== value) ||
  !refreshedIdentity.headers.getSetCookie().some((cookie) =>
    /-auth-token(?:\.\d+)?=/.test(cookie),
  )
) {
  process.stderr.write(
    `The Next proxy did not refresh the expired local session cookie (status ${refreshedIdentity.status}; updated cookies: ${refreshedIdentity.headers.getSetCookie().map((cookie) => cookie.split("=", 1)[0]).join(", ") || "none"}).\n`,
  );
  process.exit(1);
}
refreshedCookies.forEach(([name, value]) => expiredCookieJar.set(name, value));
const refreshedCookieHeader = [...expiredCookieJar]
  .map(([name, value]) => `${name}=${value}`)
  .join("; ");
const refreshedRequest = await fetch(new URL("/api/auth/me", appUrl), {
  headers: { cookie: refreshedCookieHeader },
});
const refreshedProfile = await refreshedRequest.json();
if (
  refreshedRequest.status !== 200 ||
  refreshedProfile.displayName !== "Riley Owner" ||
  refreshedProfile.role !== "USER"
) {
  process.stderr.write(
    "The refreshed local session cookie was not reusable.\n",
  );
  process.exit(1);
}

const invalidCookieHeader = [...cookieJar.keys()]
  .map((name) => `${name}=invalid`)
  .join("; ");
const invalidIdentity = await fetch(new URL("/api/auth/me", appUrl), {
  headers: { cookie: invalidCookieHeader },
});
const invalidProtectedPage = await fetch(new URL("/pets", appUrl), {
  headers: { cookie: invalidCookieHeader },
  redirect: "manual",
});
if (
  invalidIdentity.status !== 401 ||
  invalidProtectedPage.status !== 307 ||
  new URL(
    invalidProtectedPage.headers.get("location") ?? "/",
    appUrl,
  ).pathname !== "/sign-in"
) {
  process.stderr.write(
    "An invalid local session was not rejected at the identity and protected-page boundaries.\n",
  );
  process.exit(1);
}

const petId = "00000000-0000-4000-8000-000000000201";
const reportId = "00000000-0000-4000-8000-000000000301";
const foundReportId = "00000000-0000-4000-8000-000000000311";
const removedReportId = "00000000-0000-4000-8000-000000000312";
const spottingId = "00000000-0000-4000-8000-000000000302";
const conversationId = "00000000-0000-4000-8000-000000000401";
const pageChecks = [
  "/profile",
  "/pets",
  "/pets/new",
  `/pets/${petId}/edit`,
  "/lost-pets/new",
  `/lost-pets/reports/${reportId}/edit`,
  `/lost-pets/reports/${removedReportId}`,
  "/messages",
  `/messages/${conversationId}`,
];
for (const path of pageChecks) {
  const page = await fetch(new URL(path, appUrl), {
    headers: { cookie: cookieHeader },
  });
  if (page.status !== 200) {
    process.stderr.write(
      `Authenticated local page check failed for ${path} (${page.status}, redirect: ${page.headers.get("location") ?? "none"}).\n`,
    );
    process.exit(1);
  }
}

const bounds = "minLat=40.7&maxLat=40.8&minLng=-74.1&maxLng=-73.9";
const map = await fetch(new URL(`/api/map?${bounds}`, appUrl));
const activity = await map.json();
if (
  map.status !== 200 ||
  !activity.reports?.some(({ id }) => id === reportId) ||
  activity.reports?.some(({ id }) =>
    [foundReportId, removedReportId].includes(id),
  ) ||
  !activity.spottings?.some(({ id }) => id === spottingId)
) {
  process.stderr.write(
    "Public local map did not include the seeded report and spotting.\n",
  );
  process.exit(1);
}
const reportImageUrl = activity.reports.find(
  ({ id }) => id === reportId,
)?.imageUrl;
const spottingImageUrl = activity.spottings.find(
  ({ id }) => id === spottingId,
)?.imageUrl;
for (const [kind, imageUrl] of [
  ["Pet Profile", reportImageUrl],
  ["Spotting", spottingImageUrl],
]) {
  if (typeof imageUrl !== "string") {
    process.stderr.write(`Local ${kind} image URL is missing.\n`);
    process.exit(1);
  }
  const localImageUrl = new URL(imageUrl);
  if (
    !["127.0.0.1", "localhost"].includes(localImageUrl.hostname) ||
    localImageUrl.port !== "54321"
  ) {
    process.stderr.write(`Local ${kind} image URL is not loopback.\n`);
    process.exit(1);
  }
  const image = await fetch(localImageUrl);
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (
    image.status !== 200 ||
    !image.headers.get("content-type")?.startsWith("image/png") ||
    bytes.length < 8 ||
    bytes[0] !== 137 ||
    bytes[1] !== 80 ||
    bytes[2] !== 78 ||
    bytes[3] !== 71
  ) {
    process.stderr.write(`Seeded local ${kind} image did not load as PNG.\n`);
    process.exit(1);
  }
}
for (const path of [
  `/lost-pets/reports/${reportId}`,
  `/spottings/${spottingId}`,
  "/spottings/new",
]) {
  const route = await fetch(new URL(path, appUrl));
  if (route.status !== 200) {
    process.stderr.write(`Public local feature check failed for ${path}.\n`);
    process.exit(1);
  }
}

const removedReport = await fetch(
  new URL(`/lost-pets/reports/${removedReportId}`, appUrl),
);
if (removedReport.status !== 404) {
  process.stderr.write(
    `Anonymous access to a removed report returned ${removedReport.status}, expected 404.\n`,
  );
  process.exit(1);
}

const missingPage = await fetch(new URL("/__local-smoke-missing-page", appUrl));
const missingPageHtml = await missingPage.text();
if (
  missingPage.status !== 404 ||
  !missingPageHtml.includes("We couldn’t find that page") ||
  !missingPageHtml.includes("Back to map")
) {
  process.stderr.write("The local 404 page did not render its recovery link.\n");
  process.exit(1);
}

const statsResponse = await fetch(new URL("/api/stats", appUrl));
const stats = await statsResponse.json();
if (statsResponse.status !== 200 || stats.lost < 1 || stats.found < 1) {
  process.stderr.write("Local statistics did not include a found report.\n");
  process.exit(1);
}

const homePage = await fetch(new URL("/", appUrl));
const homePageHtml = await homePage.text();
if (
  homePage.status !== 200 ||
  !homePageHtml.includes('aria-current="page"') ||
  !homePageHtml.includes("Active lost pets") ||
  !homePageHtml.includes("Community spottings") ||
  !homePageHtml.includes("Pets found")
) {
  process.stderr.write("The local home page did not render all statistics.\n");
  process.exit(1);
}

const reunionsResponse = await fetch(new URL("/api/reunions", appUrl));
const reunionsPayload = await reunionsResponse.json();
if (
  reunionsResponse.status !== 200 ||
  !reunionsPayload.reunions?.some(({ id }) => id === foundReportId)
) {
  process.stderr.write("Local reunions did not include the seeded found report.\n");
  process.exit(1);
}

for (const path of [
  `/pets/${petId}/edit`,
  `/lost-pets/reports/${reportId}`,
  `/spottings/${spottingId}`,
]) {
  const page = await fetch(new URL(path, appUrl), {
    headers: { cookie: cookieHeader },
  });
  const html = await page.text();
  const sources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(
    ([, source]) => source,
  );
  if (
    !sources.some((source) =>
      source?.startsWith("http://127.0.0.1:54321/storage/v1/object/"),
    )
  ) {
    process.stderr.write(
      `Rendered local image was missing from ${path}; signed and public image URLs must be served directly.\n`,
    );
    process.exit(1);
  }
}

process.stdout.write(
  "Local Auth including invalid-session rejection, Pet Profile/report pages and images, messaging, public map pins, Spotting routes and images, stats, and reunions passed.\n",
);
