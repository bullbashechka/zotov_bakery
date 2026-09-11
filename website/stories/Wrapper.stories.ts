import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Foundations/Wrapper',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Только размещение: dir включает flex, grid включает сетку. at задаёт адаптивные значения. Вложенные обёртки не наследуют настройки. Цветов и override-пропсов нет.',
      },
      source: {
        code: '<Wrapper dir="row" gap="1rem" at={{ tablet: { dir: "column" } }}>…</Wrapper>',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('Wrapper', 'default') };
export const Column: Story = { render: () => renderExample('Wrapper', 'column') };
export const Responsive: Story = { render: () => renderExample('Wrapper', 'responsive') };
