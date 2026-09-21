import { buildXDC } from "@webxdc/vite-plugins";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [buildXDC({ outDir: "dist-xdc", outFileName: "app.xdc" })],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});
