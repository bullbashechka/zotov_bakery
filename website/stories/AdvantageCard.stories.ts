import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/AdvantageCard',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Самостоятельная карточка преимущества. advantage содержит контент и смысловой kind; itemNumber/total используются только для доступного названия. Ширину и положение задаёт Wrapper.',
      },
      source: {
        code: '<Wrapper width="18.4375rem"><AdvantageCard advantage={ADVANTAGES[0]} /></Wrapper>',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('AdvantageCard', 'default') };
export const Advantage2: Story = { render: () => renderExample('AdvantageCard', 'advantage-2') };
export const Advantage3: Story = { render: () => renderExample('AdvantageCard', 'advantage-3') };
export const Advantage4: Story = { render: () => renderExample('AdvantageCard', 'advantage-4') };
