import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Passkeys need HTTPS even on localhost. Provide WAYPOINT_TLS_KEY / WAYPOINT_TLS_CERT to serve dev over HTTPS.
const key = process.env.WAYPOINT_TLS_KEY;
const cert = process.env.WAYPOINT_TLS_CERT;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    https: key && cert ? { key: readFileSync(key), cert: readFileSync(cert) } : undefined,
  },
  build: { target: "es2022", chunkSizeWarningLimit: 700, rollupOptions: { output: { manualChunks: { react: ["react", "react-dom"] } } } },
});
