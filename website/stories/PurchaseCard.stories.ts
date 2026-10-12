import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/PurchaseCard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Адаптивная карточка способа покупки. Адреса aimer и «Семейного» открываются на обороте при наведении на кнопку или нажатии; обе стороны определяют высоту карточки.',
      },
      source: {
        code: '<Wrapper width="25rem"><PurchaseCard option={PURCHASE_OPTIONS.find((option) => option.kind === \'bakery\')} /></Wrapper>',
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
export const Aimer: Story = { render: () => renderExample('PurchaseCard', 'aimer') };
