export const HOME_SECTION_IDS = {
  hero: 'hero',
  advantages: 'advantages',
  honeyCake: 'honey-cake',
  assortment: 'assortment',
  whereToBuy: 'where-to-buy',
  history: 'history',
  faq: 'faq',
  conversion: 'conversion',
  contacts: 'contacts',
} as const;

export const HOME_NAV_LINKS = [
  { href: `#${HOME_SECTION_IDS.assortment}`, label: 'Ассортимент' },
  { href: `#${HOME_SECTION_IDS.honeyCake}`, label: 'Медовик' },
  { href: `#${HOME_SECTION_IDS.whereToBuy}`, label: 'Где купить' },
  { href: `#${HOME_SECTION_IDS.history}`, label: 'История' },
  { href: `#${HOME_SECTION_IDS.contacts}`, label: 'Контакты' },
] as const;

export const CONTACTS = {
  address: 'г. Петропавловск, ул. Лермонтова, 63.',
  twoGisUrl: 'https://2gis.kz/petropavlovsk/firm/70000001038755983',
  hours: 'пн–вс: 09:00–22:00',
  bakery: {
    display: '+7 (7152) 42-43-54',
    href: 'tel:+77152424354',
  },
  mobile: {
    display: '+7 (707) 493-93-63',
    href: 'tel:+77074939363',
  },
  whatsappNumber: '77074939363',
  instagramUrl: 'https://www.instagram.com/zotov.bakery/',
} as const;

export const SITE_NAME = 'ZOTOV bakery';
export const SITE_OWNER = 'ИП Зотов Александр Олегович';
export const SITE_OWNER_LEGAL_ADDRESS = 'Северо-Казахстанская область, г. Петропавловск, ул. Лермонтова, д. 63';
export const SITE_OWNER_EMAIL = 'zotov.buh@gmail.com';
export const SITE_TITLE = 'ZOTOV bakery — пекарня в Петропавловске';
export const SITE_DESCRIPTION =
  'Торты, десерты и выпечка ZOTOV bakery в Петропавловске. Покупайте в нашей пекарне и магазинах AIMER. Наличие уточняйте по телефону или в WhatsApp.';
export const PRIVACY_UPDATED_AT = '23 сентября 2026 года';

export const PURCHASE_LINKS = {
  aimerTwoGisUrl: 'https://2gis.kz/petropavlovsk/search/aimer',
} as const;

export const POLICY_LINKS = [
  { href: '/privacy/', label: 'Конфиденциальность' },
] as const;

export const WHATSAPP_MESSAGES = {
  general: 'Здравствуйте! Подскажите, пожалуйста, какие десерты есть в наличии и где их можно купить?',
  honeyCake: 'Здравствуйте! Подскажите, пожалуйста, есть ли медовик ZOTOV bakery в наличии, сколько он стоит и где его можно купить?',
  tendernessCake: 'Здравствуйте! Подскажите, пожалуйста, есть ли торт «Нежность» в наличии, сколько он стоит и где его можно купить?',
  bakeryAvailability: 'Здравствуйте! Подскажите, пожалуйста, какие десерты сейчас есть в наличии в пекарне ZOTOV bakery?',
  delivery: 'Здравствуйте! Хочу заказать доставку. Подскажите, пожалуйста, какие десерты есть в наличии, а также стоимость и условия доставки?',
  selectionHelp: 'Здравствуйте! Помогите выбрать десерт. Что есть в наличии и где можно купить?',
} as const;

export type WhatsAppContext = keyof typeof WHATSAPP_MESSAGES;

export function getWhatsAppUrl(context?: WhatsAppContext): string {
  if (!context) return `https://wa.me/${CONTACTS.whatsappNumber}`;

  const message = encodeURIComponent(WHATSAPP_MESSAGES[context]);
  return `https://wa.me/${CONTACTS.whatsappNumber}?text=${message}`;
}

export function getProductWhatsAppUrl(productName: string): string {
  const message = encodeURIComponent(`Здравствуйте! Подскажите цену и наличие: ${productName}.`);
  return `https://wa.me/${CONTACTS.whatsappNumber}?text=${message}`;
}
