import { copyFile } from 'node:fs/promises';

// The site's DENY policy would block Storybook's own component frames on Pages.
await copyFile(
  new URL('../.storybook/headers', import.meta.url),
  new URL('../storybook-static/_headers', import.meta.url),
);
