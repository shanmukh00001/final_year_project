import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { GLOBAL_SECURITY_HEADERS } from "./security-headers.js";

const devHeadersRecord: Record<string, string> = {};
for (const h of GLOBAL_SECURITY_HEADERS) {
  if (h.key === "Content-Security-Policy") {
    // In dev mode, Vite injects an inline script (@vitejs/plugin-react preamble) for HMR.
    devHeadersRecord[h.key] = h.value.replace(
      "script-src 'self'",
      "script-src 'self' 'unsafe-inline'",
    );
  } else {
    devHeadersRecord[h.key] = h.value;
  }
}

const prodHeadersRecord: Record<string, string> = {};
for (const h of GLOBAL_SECURITY_HEADERS) {
  prodHeadersRecord[h.key] = h.value;
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
    headers: devHeadersRecord,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    headers: prodHeadersRecord,
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
