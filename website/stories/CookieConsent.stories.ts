import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Components/CookieConsent',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Компактный нижний баннер согласия на Яндекс Метрику.',
      },
      source: {
        code: '<CookieConsent counterId="12345678" />',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('CookieConsent', 'default') };
