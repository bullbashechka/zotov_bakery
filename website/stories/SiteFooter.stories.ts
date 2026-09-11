import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/SiteFooter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная секция SiteFooter: собственные стили и взаимодействия, без внешних косметических пропсов.',
      },
      source: { code: '<SiteFooter />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('SiteFooter', 'default') };
