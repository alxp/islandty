import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      // Use vendored source until mirador-textoverlay 0.4.0 is published to npm
      'mirador-textoverlay': path.resolve(
        __dirname,
        'vendor/mirador-textoverlay/src/index.js'
      ),
    },
  },
  build: {
    lib: {
      entry: 'src/js/mirador-entry.js',
      name: 'MiradorBundle',
      formats: ['iife'],
      fileName: () => 'mirador.js',
    },
    outDir: 'web/js',
  },
});
