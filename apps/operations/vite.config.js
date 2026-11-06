import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 7001, strictPort: true },
  preview: { port: 7001, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        // Libraries in their own long-cached chunks: a deploy that changes only
        // the portal's code doesn't make phones download React again.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('lucide-react')) return 'vendor-icons';
          return undefined;
        },
      },
    },
  },
  resolve: {
    // The workspace root hoists its own React; keep this app on the one it declares
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
