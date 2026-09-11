import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// A separate source tree: component examples never become public site routes.
export default defineConfig({
  srcDir: './catalog',
  outDir: './.storybook/fixtures',
  cacheDir: './.catalog-cache',
  base: '/components',
  output: 'static',
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
});
