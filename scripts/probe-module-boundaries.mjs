import assert from "node:assert/strict";
import { ESLint } from "eslint";

const eslint = new ESLint();

async function lintImport(filePath, importPath) {
  const [result] = await eslint.lintText(
    `import { value } from ${JSON.stringify(importPath)};\nvoid value;\n`,
    { filePath },
  );
  return result.messages.filter(
    ({ ruleId, severity }) =>
      ruleId === "no-restricted-imports" && severity === 2,
  );
}

const forbiddenImports = [
  ["src/app/messages/architecture-probe.ts", "../../features/pets/repository"],
  ["src/components/architecture-probe.tsx", "../features/pets/repository"],
  ["src/components/architecture-probe.tsx", "@/features/pets/application"],
  ["src/components/architecture-probe.tsx", "@/features/reunions/application"],
  ["src/components/architecture-probe.tsx", "@/lib/auth"],
  [
    "src/features/communication/application.ts",
    "../pets/repository",
  ],
  [
    "src/features/communication/application.ts",
    "../../features/pets/repository",
  ],
  [
    "src/features/communication/application.ts",
    "@/features/pets/repository",
  ],
  [
    "src/features/communication/application.ts",
    "@/features/reunions/repository",
  ],
  [
    "src/features/communication/application.ts",
    "../../../features/reunions/repository",
  ],
  ["src/features/pets/application.ts", "../../lib/db/client"],
  ["src/features/pets/application.ts", "../../lib/supabase/server"],
  ["src/features/communication/application.ts", "@/lib/auth"],
];

for (const [filePath, importPath] of forbiddenImports) {
  assert.ok(
    (await lintImport(filePath, importPath)).length > 0,
    `Expected ${filePath} to reject ${importPath}`,
  );
}

const allowedImports = [
  ["src/features/pets/application.ts", "./repository"],
  ["src/app/pets/page.tsx", "@/features/pets/application"],
];

for (const [filePath, importPath] of allowedImports) {
  assert.equal(
    (await lintImport(filePath, importPath)).length,
    0,
    `Expected ${filePath} to allow ${importPath}`,
  );
}

console.log(
  `PASS: ${forbiddenImports.length} forbidden and ${allowedImports.length} allowed imports match module boundaries.`,
);
