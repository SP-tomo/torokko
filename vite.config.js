import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/torokko/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
});
