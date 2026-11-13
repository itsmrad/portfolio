import { execSync } from "node:child_process";

import packageJson from "../../package.json";

/** Build provenance for the footer title block. Server only, evaluated at build time. */
export function buildInfo() {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  if (!sha) {
    try {
      sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      // Not a git checkout: the footer shows "unavailable".
    }
  }
  const { next, react } = packageJson.dependencies;
  const { tailwindcss } = packageJson.devDependencies;
  return {
    sha,
    shortSha: sha.slice(0, 7),
    date: new Date().toISOString().slice(0, 10),
    stack: [
      { name: "next", version: next },
      { name: "react", version: react },
      { name: "tailwindcss", version: tailwindcss.replace(/^[\^~]/, "") },
    ],
  };
}
