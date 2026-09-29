import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  // Set this to your real deployed URL — Astro uses it to build canonical
  // links, the sitemap, and RSS feeds.
  site: 'https://example.com',
  integrations: [tailwind()],
  output: 'static',
  trailingSlash: 'never',
});
