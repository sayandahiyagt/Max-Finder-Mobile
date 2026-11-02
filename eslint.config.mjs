import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const frameworkImports = [
  {
    name: "next",
    message: "Keep framework dependencies at the application boundary.",
  },
  {
    name: "react",
    message: "Keep presentation dependencies out of feature logic.",
  },
];

const providerImports = [
  {
    name: "@supabase/ssr",
    message: "Use the Supabase integration instead of provider clients.",
  },
  {
    name: "@supabase/supabase-js",
    message: "Use the Supabase integration instead of provider clients.",
  },
  ...[
    "admin",
    "authentication",
    "browser",
    "browser-auth",
    "config",
    "proxy",
    "server",
    "storage",
    "upload",
  ].map((module) => ({
    name: `@/lib/supabase/${module}`,
    message: "Keep Supabase adapters outside feature logic.",
  })),
];

const serverBoundaryImports = [
  {
    name: "@/lib/auth",
    message: "Keep the server-only authentication boundary out of client code.",
  },
];

const databaseImports = [
  {
    name: "@prisma/client",
    message: "Access persistence through the feature repository.",
  },
  {
    name: "@/lib/db/client",
    message: "Access persistence through the feature repository.",
  },
];

const featureImportPatterns = [
  {
    group: [
      "next/*",
      "react/*",
      "**/lib/auth",
      "**/lib/supabase/*",
    ],
    message:
      "Feature modules must not depend on the web auth boundary or provider adapters.",
  },
];

const featureRepositoryPattern = {
  group: ["**/features/*/repository"],
  message: "Call a feature's application interface instead of its repository.",
};

const crossFeatureRepositoryPattern = {
  group: [
    "../*/repository",
    "../../features/*/repository",
    "../../../features/*/repository",
  ],
  message: "Call another feature's application interface instead of its repository.",
};

const featureApplicationPattern = {
  group: ["**/features/*/application"],
  message:
    "Presentation components must not depend on server-side feature operations.",
};

const presentationImportRestrictions = {
  paths: [
    ...databaseImports,
    ...providerImports.slice(0, 2),
  ],
  patterns: [
    {
      group: ["**/lib/db/*"],
      message: "Use a feature repository for database access.",
    },
    featureRepositoryPattern,
  ],
};

const componentImportRestrictions = {
  ...presentationImportRestrictions,
  paths: [
    ...presentationImportRestrictions.paths,
    ...serverBoundaryImports,
  ],
  patterns: [
    ...presentationImportRestrictions.patterns,
    featureApplicationPattern,
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-dev/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/app/**/*.{js,jsx,ts,tsx}", "src/components/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        presentationImportRestrictions,
      ],
    },
  },
  {
    files: ["src/features/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...frameworkImports,
            ...providerImports,
            ...serverBoundaryImports,
          ],
          patterns: [
            ...featureImportPatterns,
            featureRepositoryPattern,
            crossFeatureRepositoryPattern,
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        componentImportRestrictions,
      ],
    },
  },
  {
    files: [
      "src/features/**/application.{js,jsx,ts,tsx}",
      "src/features/**/types.{js,jsx,ts,tsx}",
      "src/features/**/matching.{js,jsx,ts,tsx}",
      "src/features/**/formatting.{js,jsx,ts,tsx}",
      "src/features/**/map-contract.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...frameworkImports,
            ...providerImports,
            ...databaseImports,
          ],
          patterns: [
            ...featureImportPatterns,
            { group: ["**/lib/db/*"], message: "Use a feature repository for database access." },
            featureRepositoryPattern,
            crossFeatureRepositoryPattern,
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
