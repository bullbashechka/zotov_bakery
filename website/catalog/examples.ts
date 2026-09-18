import { ASSORTMENT } from '@/lib/assortment';
import { PURCHASE_OPTIONS } from '@/lib/purchase';
import { ADVANTAGES } from '@/lib/advantages';
import { FAQ_ITEMS } from '@/lib/faq';

import type { ComponentProps } from 'astro/types';

type Components = {
  ActionLink: typeof import('../src/components/ActionLink.astro').default;
  AdvantageCard: typeof import('../src/components/AdvantageCard.astro').default;
  Advantages: typeof import('../src/components/Advantages.astro').default;
  AdvantagesDecoration: typeof import('../src/components/AdvantagesDecoration.astro').default;
  Assortment: typeof import('../src/components/Assortment.astro').default;
  ContactSection: typeof import('../src/components/ContactSection.astro').default;
  ConversionSection: typeof import('../src/components/ConversionSection.astro').default;
  Copyright: typeof import('../src/components/Copyright.astro').default;
  Faq: typeof import('../src/components/Faq.astro').default;
  FaqAccordion: typeof import('../src/components/FaqAccordion.astro').default;
  FaqItem: typeof import('../src/components/FaqItem.astro').default;
  FooterLogo: typeof import('../src/components/FooterLogo.astro').default;
  FooterNavigation: typeof import('../src/components/FooterNavigation.astro').default;
  HeaderMascot: typeof import('../src/components/HeaderMascot.astro').default;
  Hero: typeof import('../src/components/Hero.astro').default;
  HeroAdvantagesFlow: typeof import('../src/components/HeroAdvantagesFlow.astro').default;
  HoneyCake: typeof import('../src/components/HoneyCake.astro').default;
  HoneyCakeIllustration: typeof import('../src/components/HoneyCakeIllustration.astro').default;
  LegalPlaceholder: typeof import('../src/components/LegalPlaceholder.astro').default;
  NotFound: typeof import('../src/components/NotFound.astro').default;
  PageFrame: typeof import('../src/components/PageFrame.astro').default;
  PlaceholderSection: typeof import('../src/components/PlaceholderSection.astro').default;
  ProductDetails: typeof import('../src/components/ProductDetails.astro').default;
  PurchaseCard: typeof import('../src/components/PurchaseCard.astro').default;
  SiteFooter: typeof import('../src/components/SiteFooter.astro').default;
  SiteHeader: typeof import('../src/components/SiteHeader.astro').default;
  SkipLink: typeof import('../src/components/SkipLink.astro').default;
  WhereToBuy: typeof import('../src/components/WhereToBuy.astro').default;
  Wrapper: typeof import('../src/components/Wrapper.astro').default;
};
type Example = {
  [K in keyof Components]: {
    component: K;
    name: string;
    props: ComponentProps<Components[K]>;
    text?: string;
    padding?: string;
  };
}[keyof Components];
const fixedExamples: Example[] = [
  {
    component: 'ActionLink',
    name: 'default',
    props: { href: '#example', variant: 'primary' },
    text: 'Узнать подробнее',
  },
  {
    component: 'ActionLink',
    name: 'primary',
    props: { href: '#example', variant: 'primary' },
    text: 'Узнать подробнее',
  },
  {
    component: 'ActionLink',
    name: 'secondary',
    props: { href: '#example', variant: 'secondary' },
    text: 'Узнать подробнее',
  },
  {
    component: 'ActionLink',
    name: 'surface',
    props: { href: '#example', variant: 'surface' },
    text: 'Узнать подробнее',
  },
  {
    component: 'ActionLink',
    name: 'compact',
    props: { href: '#example', variant: 'primary', size: 'compact' },
    text: 'Узнать подробнее',
  },
  {
    component: 'ActionLink',
    name: 'full-width',
    props: { href: '#example', variant: 'primary', fullWidth: true },
    text: 'Узнать подробнее',
  },
  {
    component: 'ActionLink',
    name: 'mobile-width',
    props: { href: '#example', variant: 'primary', fullWidth: 'mobile' },
    text: 'Узнать подробнее',
  },
  { component: 'AdvantageCard', name: 'default', props: { advantage: ADVANTAGES[0] }, text: '' },
  {
    component: 'AdvantageCard',
    name: 'advantage-2',
    props: { advantage: ADVANTAGES[1] },
    text: '',
  },
  {
    component: 'AdvantageCard',
    name: 'advantage-3',
    props: { advantage: ADVANTAGES[2] },
    text: '',
  },
  {
    component: 'AdvantageCard',
    name: 'advantage-4',
    props: { advantage: ADVANTAGES[3] },
    text: '',
  },
  { component: 'Advantages', name: 'default', props: {}, text: '' },
  { component: 'AdvantagesDecoration', name: 'default', props: {}, text: '' },
  { component: 'Assortment', name: 'default', props: {}, text: '' },
  { component: 'ContactSection', name: 'default', props: {}, text: '' },
  { component: 'ConversionSection', name: 'default', props: {}, text: '' },
  { component: 'Copyright', name: 'default', props: {}, text: '' },
  { component: 'Faq', name: 'default', props: {}, text: '' },
  { component: 'FaqAccordion', name: 'default', props: { items: FAQ_ITEMS }, text: '' },
  { component: 'FaqAccordion', name: 'empty', props: { items: [] }, text: '' },
  {
    component: 'FaqItem',
    name: 'default',
    props: {
      id: 'question-example',
      question: 'Как узнать цену и наличие?',
      answer: 'Напишите нам в WhatsApp или позвоните.',
    },
    text: '',
  },
  {
    component: 'FaqItem',
    name: 'open',
    props: {
      id: 'question-example',
      question: 'Как узнать цену и наличие?',
      answer: 'Напишите нам в WhatsApp или позвоните.',
      open: true,
    },
    text: '',
  },
  {
    component: 'FaqItem',
    name: 'branded',
    props: {
      id: 'question-example',
      question: 'Одинаковый ли ассортимент в ZOTOV bakery и AIMER?',
      answer: 'Напишите нам в WhatsApp или позвоните.',
    },
    text: '',
  },
  { component: 'FooterLogo', name: 'default', props: {}, text: '' },
  { component: 'FooterNavigation', name: 'default', props: { variant: 'primary' }, text: '' },
  { component: 'FooterNavigation', name: 'legal', props: { variant: 'legal' }, text: '' },
  { component: 'HeaderMascot', name: 'default', props: {}, text: '' },
  { component: 'HeaderMascot', name: 'compact', props: { state: 'compact' }, text: '' },
  { component: 'Hero', name: 'default', props: {}, text: '' },
  { component: 'HeroAdvantagesFlow', name: 'default', props: {}, text: '' },
  { component: 'HoneyCake', name: 'default', props: {}, text: '' },
  { component: 'HoneyCakeIllustration', name: 'default', props: {}, text: '' },
  {
    component: 'LegalPlaceholder',
    name: 'default',
    props: { title: 'Политика конфиденциальности' },
    text: '',
  },
  { component: 'NotFound', name: 'default', props: {}, text: '' },
  { component: 'PageFrame', name: 'default', props: {}, text: '' },
  {
    component: 'PlaceholderSection',
    name: 'default',
    props: { id: 'history', title: 'Наша история' },
    text: '',
  },
  { component: 'ProductDetails', name: 'default', props: { product: ASSORTMENT[0] }, text: '' },
  { component: 'ProductDetails', name: 'product-2', props: { product: ASSORTMENT[1] }, text: '' },
  { component: 'ProductDetails', name: 'product-3', props: { product: ASSORTMENT[2] }, text: '' },
  { component: 'PurchaseCard', name: 'default', props: { option: PURCHASE_OPTIONS[0] }, text: '' },
  { component: 'PurchaseCard', name: 'option-2', props: { option: PURCHASE_OPTIONS[1] }, text: '' },
  { component: 'PurchaseCard', name: 'option-3', props: { option: PURCHASE_OPTIONS[2] }, text: '' },
  { component: 'SiteFooter', name: 'default', props: {}, text: '' },
  { component: 'SiteHeader', name: 'default', props: {}, text: '' },
  { component: 'SkipLink', name: 'default', props: {}, text: '' },
  { component: 'WhereToBuy', name: 'default', props: {}, text: '' },
  {
    component: 'Wrapper',
    name: 'default',
    props: { display: 'flex', dir: 'row', gap: '1rem', padding: '1rem' },
    text: '',
  },
  {
    component: 'Wrapper',
    name: 'column',
    props: { display: 'flex', dir: 'column', gap: '1rem', padding: '1rem' },
    text: '',
  },
  {
    component: 'Wrapper',
    name: 'responsive',
    props: {
      display: 'flex',
      dir: 'row',
      gap: '1rem',
      padding: '1rem',
      at: { tablet: { dir: 'column', gap: '2rem' } },
    },
    text: '',
  },
];

// Finite semantic combinations power live controls without duplicating component markup.
const actionExamples: Example[] = [];
for (const variant of ['primary', 'secondary', 'surface'] as const) {
  for (const size of ['regular', 'compact'] as const) {
    for (const fullWidth of [false, true, 'mobile'] as const) {
      actionExamples.push({
        component: 'ActionLink',
        name: `${variant}-${size}-${fullWidth}`,
        props: { href: '#example', variant, size, fullWidth },
        text: 'Узнать подробнее',
      });
    }
  }
}
export const examples: Example[] = [...fixedExamples, ...actionExamples];
