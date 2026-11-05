import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 7101, strictPort: true },
  preview: { port: 7101, strictPort: true },
  resolve: {
    // The workspace root hoists React 18 for other apps; this app runs on its own React 19.
    dedupe: ["react", "react-dom"],
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
})
