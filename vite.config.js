import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/bookingroom/', // Sesuaikan dengan nama repository GitHub Anda
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        user: resolve(__dirname, 'user.html'),
      }
    }
  }
});
