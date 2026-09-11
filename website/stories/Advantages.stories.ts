import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/Advantages',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция Advantages: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<Advantages />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('Advantages', 'default') };
