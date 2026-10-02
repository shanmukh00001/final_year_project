import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { GLOBAL_SECURITY_HEADERS } from "./security-headers.js";

const headersRecord: Record<string, string> = {};
for (const h of GLOBAL_SECURITY_HEADERS) {
  headersRecord[h.key] = h.value;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    headers: headersRecord,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    headers: headersRecord,
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        entryFileNames: "assets/workers/[name]-[hash].js",
      },
    },
  },
});
