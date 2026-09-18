import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Sections/PrivacyPolicy',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Страница о технических данных, cookie и Яндекс Метрике.',
      },
      source: {
        code: '<PrivacyPolicy />',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('PrivacyPolicy', 'default') };
