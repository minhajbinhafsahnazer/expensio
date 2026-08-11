import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: false,
      // eslint: { lintCommand: 'eslint "./src/**/*.{ts,tsx}"' } // Uncomment once ESLint is fully configured
    }),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      pwaAssets: {
        disabled: true,
      },
      manifest: {
        name: "Expencio",
        short_name: "Expencio",
        description: "Mobile-First, Offline-First Expense Tracker",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@expenseflow/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@expenseflow/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "clsx": path.resolve(__dirname, "./node_modules/clsx"),
      "tailwind-merge": path.resolve(__dirname, "./node_modules/tailwind-merge"),
      "lucide-react": path.resolve(__dirname, "./node_modules/lucide-react"),
      "framer-motion": path.resolve(__dirname, "./node_modules/framer-motion"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy all /api requests to the backend container in dev.
      // This ensures the refresh_token HttpOnly cookie is scoped to the
      // same origin as the frontend, mirroring production reverse-proxy setup.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
