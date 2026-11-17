import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' makes the build work from any sub-path (GitHub Pages project sites, Vercel, Netlify).
export default defineConfig({
  plugins: [react()],
  base: './',
  // The server has its own package and its own tests (cd server && npm test).
  test: { exclude: [...configDefaults.exclude, 'server/**'] },
});
