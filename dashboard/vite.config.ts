import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dashboard SPA. Proxies nothing — talks directly to the Calmutopia API via
// VITE_API_BASE (see src/lib/api.ts). CORS is open on the server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
  },
});
