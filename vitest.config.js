import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react({ include: /\.(jsx?|tsx?)$/ })],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    globals: true,
    include: ["tests/**/*.{test,spec}.{js,jsx}"],
    exclude: ["node_modules", ".next", ".kilo"],
    server: {
      deps: {
        inline: [/@\/app\/dashboard\/page/],
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
