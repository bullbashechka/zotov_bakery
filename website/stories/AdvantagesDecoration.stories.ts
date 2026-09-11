import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/AdvantagesDecoration',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Декоративные линии и их адаптивные SVG-варианты. Компонент размещается в относительно позиционированной обёртке.',
      },
      source: {
        code: '<Wrapper position="relative"><AdvantagesDecoration /></Wrapper>',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('AdvantagesDecoration', 'default') };
