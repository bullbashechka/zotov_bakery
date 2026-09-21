import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/NotFound',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Содержимое страницы 404 со ссылкой для возврата на главную.',
      },
      source: {
        code: '<NotFound />',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('NotFound', 'default') };
