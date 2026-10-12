import type { ImageMetadata } from 'astro';
import deliveryImage from '@/assets/where-to-buy/delivery.png';

export interface PurchaseOption {
  kind: 'bakery' | 'supermarket' | 'semeiniy' | 'delivery';
  title: string;
  description: string;
  action: string;
  href: string;
  image: string | ImageMetadata;
  imageAlt: string;
  addressesTitle?: string;
  addresses?: readonly { label: string; href: string }[];
}

import { CONTACTS, getWhatsAppUrl, PURCHASE_LINKS } from './site';

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
    title: 'С доставкой на дом или в офис',
    description:
      `Напишите нам в WhatsApp. Подскажем, что есть в наличии, и уточним стоимость и условия доставки. ${CONTACTS.orderAcceptanceNote}`,
    action: 'Заказать доставку',
    href: getWhatsAppUrl('delivery'),
    image: deliveryImage,
    imageAlt: '',
    kind: 'delivery',
  },
  {
    title: 'В супермаркетах «aimer»',
    description:
      'Продукцию ZOTOV bakery можно найти в магазинах сети в Петропавловске. Ассортимент может отличаться.',
    action: 'Посмотреть адреса',
    href: PURCHASE_LINKS.aimerTwoGisUrl,
    image: '/where-to-buy/aimer.png',
    imageAlt: '',
    kind: 'supermarket',
    addressesTitle: 'Супермаркеты aimer',
    addresses: [
      { label: 'ул. Магжана Жумабаева, 91 · DOSTYQ mall', href: 'https://2gis.kz/petropavlovsk/firm/70000001039298482' },
      { label: 'ул. Конституции Казахстана, 74', href: 'https://2gis.kz/petropavlovsk/firm/70000001067005212' },
    ],
  },
  {
    title: 'В супермаркетах «Семейный»',
    description:
      'Продукцию ZOTOV bakery можно найти в магазинах сети в Петропавловске. Ассортимент может отличаться.',
    action: 'Посмотреть адреса',
    href: 'https://semeiniy.kz/stores/',
    image: '/where-to-buy/semeiniy.webp',
    imageAlt: '',
    kind: 'semeiniy',
    addressesTitle: 'Супермаркеты «Семейный»',
    addresses: [
      { label: 'ул. Магжана Жумабаева, 138', href: 'https://2gis.kz/petropavlovsk/firm/70000001065562526' },
      { label: 'ул. Нурсултана Назарбаева, 252', href: 'https://2gis.kz/petropavlovsk/firm/70000001109510087' },
      { label: 'ул. Нурсултана Назарбаева, 339Б', href: 'https://2gis.kz/petropavlovsk/firm/70000001066611682' },
      { label: 'ул. Жалела Кизатова, 3Е', href: 'https://2gis.kz/petropavlovsk/firm/70000001093844342' },
    ],
  },
] as const satisfies readonly PurchaseOption[];
