import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/FooterLogo',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Логотип подвала с локальным наклоном от указателя. Размер места под логотип задаёт обёртка.',
      },
      source: { code: '<Wrapper width="24.5rem"><FooterLogo /></Wrapper>', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('FooterLogo', 'default') };
