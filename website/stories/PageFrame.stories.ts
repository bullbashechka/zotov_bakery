import type { Meta, StoryObj } from '@storybook/html-vite';
import { renderExample } from './render';

const meta = {
  title: 'Composition/PageFrame',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Каркас документа: skip-link, header, main и footer. Именованные слоты задают содержимое; документные метаданные остаются в BaseLayout.',
      },
      source: {
        code: '<PageFrame><SiteHeader slot="header" /><HeroAdvantagesFlow /><SiteFooter slot="footer" /></PageFrame>',
        language: 'html',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => renderExample('PageFrame', 'default') };
