import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser talks to Vite (port 5173). Anything starting with /api is
// forwarded to our small Express server (port 3001), which holds the secret keys.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
