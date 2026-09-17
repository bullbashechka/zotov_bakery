import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/BrandHistory',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'История бренда с семантическим вертикальным fallback, временной шкалой и интерактивной каруселью.',
      },
      source: { code: '<BrandHistory />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('BrandHistory', 'default') };
