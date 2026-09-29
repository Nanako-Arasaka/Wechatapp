import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: "index.html",
        preview: "preview.html",
        motion: "animation-preview.html",
      },
    },
  },
  server: {
    fs: { deny: ["**/server/**", "**/.git/**", "**/.env*"] },
  },
});
