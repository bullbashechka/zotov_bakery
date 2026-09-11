import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/HoneyCake',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция HoneyCake: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<HoneyCake />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('HoneyCake', 'default') };
