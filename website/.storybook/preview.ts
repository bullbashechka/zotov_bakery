import type { Preview } from '@storybook/html-vite';
import './preview.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    options: {
      storySort: {
        order: ['Foundations', 'Actions', 'Content', 'Navigation', 'Sections', 'Composition'],
      },
    },
  },
};
export default preview;
