import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Actions/ActionLink',
  tags: ['autodocs'],
  args: { variant: 'primary', size: 'regular', fullWidth: false },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'surface'],
      description: 'Визуальный режим кнопки',
    },
    size: {
      control: 'inline-radio',
      options: ['regular', 'compact'],
      description: 'Размер текста и области нажатия',
    },
    fullWidth: {
      control: 'inline-radio',
      options: [false, true, 'mobile'],
      description: 'Заполнение доступной ширины',
    },
  },
  render: ({ variant, size, fullWidth }) =>
    renderExample('ActionLink', `${variant}-${size}-${fullWidth}`),
  parameters: {
    controls: { disable: false },
    docs: {
      description: {
        component:
          'Ссылка-действие. variant, size и fullWidth полностью определяют её вид. external открывает ссылку в новой вкладке с безопасным rel. Controls переключают реальные Astro-примеры.',
      },
      source: {
        code: '<ActionLink href="#assortment" variant="primary" size="compact" fullWidth="mobile">Посмотреть ассортимент</ActionLink>',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Surface: Story = { args: { variant: 'surface' } };
export const Compact: Story = { args: { size: 'compact' } };
export const FullWidth: Story = { args: { fullWidth: true } };
export const MobileWidth: Story = { args: { fullWidth: 'mobile' } };
