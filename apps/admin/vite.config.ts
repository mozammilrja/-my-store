import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 7001, strictPort: true },
  resolve: {
    // The workspace root hoists its own React; keep this app on the one it declares
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
