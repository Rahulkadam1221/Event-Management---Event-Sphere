import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    https: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false, // Turn off sourcemaps for production performance
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Bundle core React dependencies
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-core';
            }
            // Bundle heavy charting components separately
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
          }
        },
      },
    },
  },
});
