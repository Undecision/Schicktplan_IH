import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@schichtbuch/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    host: true,
    port: Number(process.env.WEB_PORT) || 5173,
    // Spiegelt Caddys Produktiv-Routing (/api -> api-Container) für den Dev-Server.
    // Verhindert insbesondere, dass unter "/api/*" der SPA-History-Fallback
    // (index.html, Status 200) statt eines echten 401/404 zurückkommt.
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
