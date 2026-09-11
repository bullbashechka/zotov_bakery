import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Composition/HeroAdvantagesFlow',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Готовая композиция Hero и Advantages. Перекрытие и обрезка декоративной линии принадлежат обёрткам.',
      },
      source: { code: '<HeroAdvantagesFlow />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('HeroAdvantagesFlow', 'default') };
