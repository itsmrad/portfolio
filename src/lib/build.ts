import packageJson from "../../package.json";

/**
 * Build provenance for the footer title block. The commit and the date are
 * inlined by next.config.ts when the site is built, so a page re-rendered on
 * the server later still names the build it belongs to.
 */
export function buildInfo() {
  const sha = process.env.BUILD_SHA ?? "";
  const { next, react } = packageJson.dependencies;
  const { tailwindcss } = packageJson.devDependencies;
  return {
    sha,
    shortSha: sha.slice(0, 7),
    date: process.env.BUILD_DATE ?? "",
    stack: [
      { name: "next", version: next },
      { name: "react", version: react },
      { name: "tailwindcss", version: tailwindcss.replace(/^[\^~]/, "") },
    ],
  };
}
