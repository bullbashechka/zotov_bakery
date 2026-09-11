export interface PurchaseOption {
  kind: 'bakery' | 'supermarket' | 'delivery';
  title: string;
  description: string;
  action: string;
  href: string;
  image: string;
  imageAlt: string;
}

import { getWhatsAppUrl, PURCHASE_LINKS } from './site';

export const PURCHASE_OPTIONS = [
  {
    title: 'В пекарне ZOTOV bakery',
    description:
      'Выберите готовый десерт в пекарне без предварительного заказа. Наличие можно уточнить по телефону или в WhatsApp.',
    action: 'Уточнить наличие',
    href: getWhatsAppUrl('bakeryAvailability'),
    image: '/zotov-logo.svg',
    imageAlt: '',
    kind: 'bakery',
  },
  {
    title: 'В супермаркетах aimer',
    description:
      'Продукцию ZOTOV bakery можно найти в магазинах сети в Петропавловске. Ассортимент может отличаться.',
    action: 'Посмотреть адреса',
    href: PURCHASE_LINKS.aimerTwoGisUrl,
    image: '/where-to-buy/aimer.png',
    imageAlt: '',
    kind: 'supermarket',
  },
  {
    title: 'С доставкой на дом или в офис',
    description:
      'Напишите нам в WhatsApp. Подскажем, что есть в наличии, и уточним стоимость и условия доставки.',
    action: 'Заказать доставку',
    href: getWhatsAppUrl('delivery'),
    image: '/where-to-buy/delivery.png',
    imageAlt: '',
    kind: 'delivery',
  },
] as const satisfies readonly PurchaseOption[];
