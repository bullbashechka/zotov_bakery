import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/FaqItem',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Нативный details с локальной анимацией и поддержкой reduced motion. id связывает вопрос и ответ; open задаёт начальное состояние. Внешние CSS-переопределения не нужны.',
      },
      source: {
        code: '<FaqItem id="delivery" question="Есть ли доставка?" answer="Уточните условия в WhatsApp." open />',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('FaqItem', 'default') };
export const Open: Story = { render: () => renderExample('FaqItem', 'open') };
export const Branded: Story = { render: () => renderExample('FaqItem', 'branded') };
