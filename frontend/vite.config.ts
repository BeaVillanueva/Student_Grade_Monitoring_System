import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      allow: [frontendRoot],
      deny: ['.env', '.env.*', '**/.git/**', '**/*.sql', '**/*.pem', '**/*.key'],
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
    },
  },
});
