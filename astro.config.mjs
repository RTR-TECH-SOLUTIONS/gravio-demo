import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Demo publicat pe GitHub Pages: https://rtr-tech-solutions.github.io/gravio-demo/
// Local (npm run dev) rulează la rădăcină; build-ul pentru Pages setează GH_PAGES=1.
// TODO(real): la domeniul clientului, `site` devine domeniul lui și `base` se scoate.
const pages = process.env.GH_PAGES === '1';

export default defineConfig({
  site: pages ? 'https://rtr-tech-solutions.github.io' : undefined,
  base: pages ? '/gravio-demo' : undefined,
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
