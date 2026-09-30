import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    // three is only imported lazily; pre-bundle it so the dev server never re-optimizes mid-session
    optimizeDeps: {
      include: ['three', 'three/examples/jsm/controls/OrbitControls.js', 'three/examples/jsm/environments/RoomEnvironment.js', 'three/examples/jsm/geometries/RoundedBoxGeometry.js'],
    },
  },
});
