import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/FaqAccordion',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Координирует пункты через событие открытия и метод close. Оформление и переходы принадлежат FaqItem. Первый пункт открыт; отдельная история проверяет пустой список.',
      },
      source: { code: '<FaqAccordion id="questions" items={FAQ_ITEMS} />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('FaqAccordion', 'default') };
export const Empty: Story = { render: () => renderExample('FaqAccordion', 'empty') };
