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

export const CONTACTS = {
  bakery: {
    display: '+7 (7152) 42-43-54',
    href: 'tel:+77152424354',
  },
  mobile: {
    display: '+7 707 493-93-63',
    href: 'tel:+77074939363',
  },
  whatsappNumber: '77074939363',
} as const;

export const WHATSAPP_MESSAGES = {
  general: 'Здравствуйте! Подскажите, пожалуйста, какие десерты есть в наличии и где их можно купить?',
  honeyCake: 'Здравствуйте! Подскажите, пожалуйста, есть ли медовик ZOTOV bakery в наличии, сколько он стоит и где его можно купить?',
  tendernessCake: 'Здравствуйте! Подскажите, пожалуйста, есть ли торт «Нежность» в наличии, сколько он стоит и где его можно купить?',
  bakeryAvailability: 'Здравствуйте! Подскажите, пожалуйста, какие десерты сейчас есть в наличии в пекарне ZOTOV bakery?',
  delivery: 'Здравствуйте! Хочу заказать доставку. Подскажите, пожалуйста, какие десерты есть в наличии, а также стоимость и условия доставки?',
  selectionHelp: 'Здравствуйте! Помогите, пожалуйста, выбрать десерт. Подскажите, какие варианты есть в наличии и где их можно купить?',
} as const;

export type WhatsAppContext = keyof typeof WHATSAPP_MESSAGES;

export function getWhatsAppUrl(context: WhatsAppContext): string {
  const message = encodeURIComponent(WHATSAPP_MESSAGES[context]);

  return `https://wa.me/${CONTACTS.whatsappNumber}?text=${message}`;
}
