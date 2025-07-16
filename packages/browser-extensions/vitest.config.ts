import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["extensions/src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/vitest.setup.ts",
      ],
    },
    // Ensure proper DOM environment without external resource loading
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000",
        pretendToBeVisual: true,
      },
    },
  },
  resolve: {
    alias: {
      "@common": new URL("./extensions/src", import.meta.url).pathname,
    },
  },
});
