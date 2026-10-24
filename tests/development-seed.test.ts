import { spawnSync } from "node:child_process";
import path from "node:path";

describe("development seed safety", () => {
  it("refuses a hosted Supabase project before making a request", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), "scripts/seed-development.mjs")],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "dummy-test-value",
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Hosted and production projects are refused.",
    );
  });
});
