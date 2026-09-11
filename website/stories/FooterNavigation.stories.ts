import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Navigation/FooterNavigation',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Две смысловые группы ссылок: primary и legal. Все состояния ссылок и адаптивный ритм находятся внутри.',
      },
      source: { code: '<FooterNavigation variant="legal" />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('FooterNavigation', 'default') };
export const Legal: Story = { render: () => renderExample('FooterNavigation', 'legal') };
