import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/Assortment',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция Assortment: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<Assortment />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('Assortment', 'default') };
