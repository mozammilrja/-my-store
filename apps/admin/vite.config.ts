import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The workspace root hoists React 18 for the backend; keep this app on its own React 19
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
