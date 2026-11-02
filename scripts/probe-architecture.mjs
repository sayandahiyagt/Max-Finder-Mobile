import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

// These local probes preserve coordinate-validation fixes at integration boundaries.
// Provider modules are replaced before evaluation. No credentials or network are used.
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const evaluatedModule = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      exports: evaluatedModule.exports,
      module: evaluatedModule,
      FormData,
      File,
      URL,
      console,
      require(name) {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        throw new Error(`Unstubbed import: ${name}`);
      },
    },
    { filename: path },
  );
  return evaluatedModule.exports;
}

const mapRequest = load("src/app/api/map/request.ts", {
  "@/features/search/types": load("src/features/search/types.ts"),
  "@/lib/coordinates": load("src/lib/coordinates.ts"),
});
const invalidMapRequest = mapRequest.parseMapRequest(
  new URLSearchParams({ minLat: "-91", maxLat: "90" }),
);
assert.equal(invalidMapRequest.ok, false);
console.log("PASS: out-of-range map bounds are rejected.");

const invalidRadiusRequest = mapRequest.parseMapRequest(
  new URLSearchParams({
    centerLatitude: "91",
    centerLongitude: "0",
    radiusMiles: "5",
  }),
);
assert.equal(invalidRadiusRequest.ok, false);
console.log("PASS: out-of-range map search coordinates are rejected.");

let geocodeCalls = 0;
const geocode = load("src/app/api/geocode/route.ts", {
  "next/server": require("next/server"),
  "@/lib/coordinates": load("src/lib/coordinates.ts"),
  "@/lib/geocoding": {
    reverseGeocode: async () => {
      geocodeCalls++;
      return "Dummy address";
    },
    searchLocations: async () => [],
  },
});
const { NextRequest } = require("next/server");
const response = await geocode.GET(
  new NextRequest("http://localhost/api/geocode?lat=91&lon=181"),
);
assert.equal(response.status, 400);
assert.equal(geocodeCalls, 0);
console.log("PASS: out-of-range coordinates are rejected before geocoding.");
