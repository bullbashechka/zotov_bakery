import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/PurchaseCard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Способ покупки с собственными изображением, поверхностью и кнопкой. option.kind описывает канал покупки; положения в ступенчатой ленте компонент не знает.',
      },
      source: {
        code: '<Wrapper width="25rem"><PurchaseCard option={PURCHASE_OPTIONS[0]} /></Wrapper>',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('PurchaseCard', 'default') };
export const Option2: Story = { render: () => renderExample('PurchaseCard', 'option-2') };
export const Option3: Story = { render: () => renderExample('PurchaseCard', 'option-3') };
