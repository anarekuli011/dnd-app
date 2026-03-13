import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: "electron/main.ts",
      },
      {
        // Preload script entry
        entry: "electron/preload.ts",
        onstart(args) {
          // Notify the renderer process to reload when preload scripts are rebuilt
          args.reload();
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@features": path.resolve(__dirname, "src/features"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@config": path.resolve(__dirname, "src/config"),
    },
  },
});
