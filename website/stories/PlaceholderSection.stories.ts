import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/PlaceholderSection',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Секция-заглушка: id используется для навигации, title — для заголовка. Рамка и типографика локальны.',
      },
      source: {
        code: '<PlaceholderSection id="history" title="Наша история" />',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('PlaceholderSection', 'default') };
