import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/LegalPlaceholder',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Визуальное содержимое временной юридической страницы. title — единственный пропс; description, canonicalUrl и robots передаются в BaseLayout.',
      },
      source: {
        code: '<LegalPlaceholder title="Политика конфиденциальности" />',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('LegalPlaceholder', 'default') };
