import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { "no-console": "error" } },
  // Gate scripts and specs report their measurements on stdout.
  { files: ["scripts/**", "tests/**"], rules: { "no-console": "off" } },
  globalIgnores([".next/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);
