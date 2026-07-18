import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    outDir: "extension-dist",
    sourcemap: false,
    lib: {
      entry: "extension/src/background.ts",
      name: "ShepherdLensBackground",
      formats: ["iife"],
      fileName: () => "background.js",
    },
  },
});
