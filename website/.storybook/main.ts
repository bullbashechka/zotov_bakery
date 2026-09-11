import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  framework: '@storybook/html-vite',
  stories: ['../stories/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  staticDirs:
    process.env.STORYBOOK_ASTRO_DEV === 'true'
      ? ['../public']
      : [{ from: './fixtures', to: '/components' }, '../public'],
  viteFinal(config) {
    config.server = {
      ...config.server,
      watch: { ...config.server?.watch, usePolling: true, interval: 250 },
    };
    config.define = {
      ...config.define,
      __ASTRO_DEV__: JSON.stringify(process.env.STORYBOOK_ASTRO_DEV === 'true'),
    };
    return config;
  },
  core: { disableTelemetry: true },
};
export default config;
