import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/ConversionSection',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция ConversionSection: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<ConversionSection />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('ConversionSection', 'default') };
