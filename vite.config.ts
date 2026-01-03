
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Essential for Electron and Capacitor relative paths
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser', // Use Terser for better minification/obfuscation
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
      format: {
        comments: false, // Remove comments
      },
    },
  },
});
