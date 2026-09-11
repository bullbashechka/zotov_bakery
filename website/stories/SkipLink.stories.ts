import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Foundations/SkipLink',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Ссылка перехода к основному содержимому. Нажмите Tab для видимого состояния; целевой элемент — main-content в PageFrame.',
      },
      source: { code: '<SkipLink />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('SkipLink', 'default') };
