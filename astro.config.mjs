// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';

const isEdge = process.env.POS_EDGE === 'true';

let adapter;
if (isEdge) {
  const { default: cloudflare } = await import('@astrojs/cloudflare');
  adapter = cloudflare({ configPath: './wrangler.jsonc', prerenderEnvironment: 'node' });
} else {
  const { default: vercel } = await import('@astrojs/vercel');
  adapter = vercel();
}

// https://astro.build/config
export default defineConfig({
  adapter,
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()]
  }
});
