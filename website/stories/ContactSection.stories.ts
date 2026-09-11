import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/ContactSection',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Контактная композиция с собственной рамкой, заголовком, ссылками и адаптивностью. Родитель выделяет только место в сетке.',
      },
      source: { code: '<ContactSection />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('ContactSection', 'default') };
