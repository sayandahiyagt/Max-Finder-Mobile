import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isLocalTestEnvironment } from "./helpers/local-environment";

const supabaseUrl = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

(isLocalTestEnvironment ? describe : describe.skip)("local media audit", () => {
  it("reports synthetic unreferenced objects without changing them", async () => {
    if (!supabaseUrl || !serviceRoleKey || !databaseUrl)
      throw new Error("Local Supabase settings are required for this test.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const candidates = [
      {
        bucket: "pet-images",
        path: `media-audit/${randomUUID()}/pets/test.png`,
      },
      {
        bucket: "spotting-images",
        path: `media-audit/${randomUUID()}.png`,
      },
    ] as const;
    const uploaded: typeof candidates[number][] = [];
    const image = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: "image/png",
    });

    try {
      for (const candidate of candidates) {
        const { error } = await supabase.storage
          .from(candidate.bucket)
          .upload(candidate.path, image, { contentType: "image/png" });
        expect(error).toBeNull();
        if (error) throw error;
        uploaded.push(candidate);
      }

      const audit = spawnSync(
        process.execPath,
        [resolve("scripts/audit-local-media.mjs")],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
          },
        },
      );

      expect(audit.error).toBeUndefined();
      expect(audit.status).toBe(0);
      for (const candidate of candidates)
        expect(audit.stdout).toContain(`${candidate.bucket}/${candidate.path}`);
      expect(audit.stdout).toContain("never changes storage or database rows");
    } finally {
      for (const candidate of uploaded) {
        const { error } = await supabase.storage
          .from(candidate.bucket)
          .remove([candidate.path]);
        expect(error).toBeNull();
      }
    }
  }, 20_000);
});
