// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';

const isEdge = process.env.POS_EDGE === 'true';
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

let adapter;
if (isEdge) {
  const { default: cloudflare } = await import('@astrojs/cloudflare');
  adapter = cloudflare({ configPath: './wrangler.jsonc', prerenderEnvironment: 'node' });
} else if (isVercel) {
  const { default: vercel } = await import('@astrojs/vercel');
  adapter = vercel();
} else {
  const { default: node } = await import('@astrojs/node');
  adapter = node({ mode: 'standalone' });
}

// https://astro.build/config
export default defineConfig({
  adapter,
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()]
  }
});
