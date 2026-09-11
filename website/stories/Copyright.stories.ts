import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Content/Copyright',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Строка авторского права обновляет год при загрузке. Отступы и положение остаются у родителя.',
      },
      source: { code: '<Copyright />', language: 'html' },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('Copyright', 'default') };
