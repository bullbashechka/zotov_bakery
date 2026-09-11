import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/HoneyCakeIllustration',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Медовик с тремя интерактивными подсказками. Изображение, координаты, размеры панелей и анимации принадлежат иллюстрации. Escape закрывает панель и возвращает фокус.',
      },
      source: { code: '<HoneyCakeIllustration />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('HoneyCakeIllustration', 'default') };
