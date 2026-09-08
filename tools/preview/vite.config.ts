import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the site with relative asset paths so tools/preview/build.mjs can
// inline everything into one HTML file. Not part of the deployed site.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { "import.meta.env.VITE_HASH_ROUTER": JSON.stringify("1") },
  build: {
    target: "es2022",
    outDir: "tools/preview/.out",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: { output: { manualChunks: undefined, inlineDynamicImports: true } },
  },
});
