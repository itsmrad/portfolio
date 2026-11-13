import { defineConfig } from "@playwright/test";

// Tests run against the production build (`npm run build` first), served by `next start`.
// Each worktree sets its own GATE_PORT, so branches can run their gates at the same time.
const PORT = Number(process.env.GATE_PORT ?? 3210);

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Never reuse: a leftover server would be serving an older build.
    reuseExistingServer: false,
  },
});
