import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin to ensure Buffer is available globally and not externalized
function bufferPolyfillPlugin(): Plugin {
  return {
    name: 'buffer-polyfill-plugin',
    enforce: 'pre',
    configResolved(config) {
      // Ensure buffer is included in optimizeDeps
      if (!config.optimizeDeps.include) {
        config.optimizeDeps.include = [];
      }
      if (!config.optimizeDeps.include.includes('buffer')) {
        config.optimizeDeps.include.push('buffer');
      }
    },
    transform(code, id) {
      // Inject Buffer polyfill at the start of entry files
      if (id.includes('main.tsx') || id.includes('polyfills.ts')) {
        return code;
      }
      return code;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [bufferPolyfillPlugin(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  build: {
    commonjsOptions: {
      include: [/buffer/, /node_modules/],
    },
  },
});
