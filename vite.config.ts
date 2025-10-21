import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
    }),
  ],
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "170040534c13.ngrok-free.app",
      ".ngrok-free.app", // Allow all ngrok free domains
      ".ngrok.io", // Allow all ngrok domains
    ],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  ssr: {
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./app"),
      },
    },
  },
});

