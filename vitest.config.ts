import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        // load opentype.js with Node itself: running its UMD bundle through vite-node's
        // module interop fails ("Cannot assign to read only property 'load'")
        external: [/opentype\.js/],
      },
    },
  },
});
