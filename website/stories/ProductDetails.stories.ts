import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/ProductDetails',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Полная информация о десерте: название, описание, состав, вкусовая плашка и действие. Пустой состав имеет штатный текст. Состояния карусели не требуют внешних CSS-переопределений.',
      },
      source: { code: '<ProductDetails product={ASSORTMENT[0]} />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('ProductDetails', 'default') };
export const Product2: Story = { render: () => renderExample('ProductDetails', 'product-2') };
export const Product3: Story = { render: () => renderExample('ProductDetails', 'product-3') };
