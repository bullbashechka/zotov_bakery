import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/HeaderMascot',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Логотип с собственной анимацией. state expanded/compact управляет размером; CSS не читает состояние родительской шапки.',
      },
      source: { code: '<HeaderMascot state="compact" />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('HeaderMascot', 'default') };
export const Compact: Story = { render: () => renderExample('HeaderMascot', 'compact') };
