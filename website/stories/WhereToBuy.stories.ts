import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/WhereToBuy',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция WhereToBuy: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<WhereToBuy />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('WhereToBuy', 'default') };
