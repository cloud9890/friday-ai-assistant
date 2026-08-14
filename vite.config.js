import { defineConfig } from 'vite';
import fridayOSPlugin from './vite-plugin-os.js';

export default defineConfig({
  plugins: [fridayOSPlugin()],
  server: {
    port: 5173,
    open: false
  }
});
