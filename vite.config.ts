import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// d3-celestial NO se importa aquí a propósito: se sirve desde `public/vendor`
// (ver scripts/copy-vendor.mjs) y se inyecta como <script> clásico en runtime.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
  base: "/KeiStars/",
});
