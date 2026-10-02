import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // tsconfig keeps JSX as "preserve" for Next; tests compile it with the automatic runtime.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      // "server-only" throws outside React Server Components; tests import server modules.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "src/**/*.test.ts"],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      reporter: ["text", "html"],
    },
  },
});
