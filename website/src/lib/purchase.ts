export interface PurchaseOption {
  kind: 'bakery' | 'supermarket' | 'semeiniy' | 'delivery';
  title: string;
  description: string;
  action: string;
  href: string;
  image: string;
  imageAlt: string;
  addresses?: readonly { label: string; href: string }[];
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
      'Продукцию ZOTOV bakery можно найти в магазинах сети в Петропавловске. Ассортимент может отличаться. Наличие конкретного десерта уточняйте в выбранном магазине AIMER.',
    action: 'Посмотреть адреса',
    href: PURCHASE_LINKS.aimerTwoGisUrl,
    image: '/where-to-buy/aimer.png',
    imageAlt: '',
    kind: 'supermarket',
  },
  {
    title: 'В магазинах «Семейный»',
    description:
      'Четыре магазина в Петропавловске. Ассортимент и наличие уточняйте в выбранном магазине.',
    action: 'Посмотреть адреса',
    href: 'https://semeiniy.kz/stores/',
    image: '/where-to-buy/semeiniy.png',
    imageAlt: '',
    kind: 'semeiniy',
    addresses: [
      { label: 'ул. Магжана Жумабаева, 138', href: 'https://2gis.kz/petropavlovsk/firm/70000001065562526' },
      { label: 'ул. Нурсултана Назарбаева, 252', href: 'https://2gis.kz/petropavlovsk/firm/70000001109510087' },
      { label: 'ул. Нурсултана Назарбаева, 339Б', href: 'https://2gis.kz/petropavlovsk/firm/70000001066611682' },
      { label: 'ул. Жалела Кизатова, 3Е', href: 'https://2gis.kz/petropavlovsk/firm/70000001093844342' },
    ],
  },
  {
    title: 'С доставкой на дом или в офис',
    description:
      'Наличие, адрес и время доставки согласуем в WhatsApp. Подскажем стоимость и условия доставки.',
    action: 'Заказать доставку',
    href: getWhatsAppUrl('delivery'),
    image: '/where-to-buy/delivery.png',
    imageAlt: '',
    kind: 'delivery',
  },
] as const satisfies readonly PurchaseOption[];
