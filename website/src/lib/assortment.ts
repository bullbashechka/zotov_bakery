import tenderness from '@/assets/assortment/tenderness.png';
import celebration from '@/assets/assortment/celebration.png';
import caramel from '@/assets/assortment/caramel.png';

// The client approved temporary copy for the additional products on 2026-09-10.
// Replace draft names/descriptions and confirm photo-to-product mapping before release.
// Ingredients must come from the bakery; never infer them from the photographs.
export const ASSORTMENT = [
  {
    id: 'tenderness',
    name: 'Торт «Нежность»',
    image: tenderness,
    alt: 'Кусочек торта «Нежность» с кокосовой стружкой и грецким орехом на терракотовом блюде',
    description: 'Мягкий, поистине нежный, бисквитный торт. Сливочный крем создает пушистое облако, посыпанное кокосовой стружкой и грецким орехом.',
    highlight: 'нежный крем · кокос · грецкий орех',
    ingredients: 'мука пшеничная в/с, яйцо, сахар, сметана, желатин, сгущенка вареная, кокосовая стружка, грецкий орех.',
    draft: false,
  },
  {
    id: 'caramel',
    name: 'Десерт «Карамельное облако»',
    image: caramel,
    alt: 'Десерт с белым покрытием и золотистой сеточкой на керамической тарелке',
    description: 'Маленький повод устроить себе праздник. Белоснежный десерт с золотистой сеточкой украсит паузу на чай и встречу с близкими.',
    highlight: 'к чаю · для маленьких праздников',
    ingredients: null,
    draft: true,
  },
  {
    id: 'celebration',
    name: 'Торт «Праздничный букет»',
    image: celebration,
    alt: 'Круглые торты с розовыми и белыми цветами, зелёными листьями и светлым бордюром',
    description: 'Торт с цветочным оформлением для самых тёплых встреч. Розовые и белые цветы напоминают о домашних праздниках, которые хочется повторять.',
    highlight: 'цветочное оформление · к общему столу',
    ingredients: null,
    draft: true,
  },
] as const;
