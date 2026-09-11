import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/Hero',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция Hero: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<Hero />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('Hero', 'default') };
