// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Use Vercel adapter for proper SSR/static deployment on Vercel
  // This is the minimal, correct change to fix 404s on Vercel.
  adapter: vercel(),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()]
  }
});
