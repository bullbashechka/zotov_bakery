import type { ImageMetadata } from 'astro';

import history1992 from '@/assets/history/history-1992.webp';
import history2007 from '@/assets/history/history-2007.webp';
import history2014 from '@/assets/history/history-2014.webp';
import history2026 from '@/assets/history/history-2026.webp';

export interface HistoryEvent {
  id: string;
  year: string;
  date?: string;
  title: string;
  paragraphs: string[];
  image: ImageMetadata;
  side: 'left' | 'right';
}

/**
 * The history copy is kept in a typed data module so the static fallback,
 * enhanced scroll scene and future CMS migration all share one source.
 */
export const HISTORY_EVENTS: HistoryEvent[] = [
  {
    id: 'history-1992',
    year: '1992',
    title: 'Всё началось с орехов и домашних тортов',
    paragraphs: [
      'Основатель семейного бизнеса Зотов Олег Анатольевич сам привозил в Петропавловск орехи и развозил их по рынкам.',
      'В это же время его супруга начала печь медовые торты по семейному рецепту. Так появился десерт, который позже стал основным кондитерским направлением.',
    ],
    image: history1992,
    side: 'left',
  },
  {
    id: 'history-2007',
    year: '2007',
    date: '2007-02-02',
    title: 'Собственное производство орехов',
    paragraphs: [
      '02.02.2007 семья Зотовых основала ИП «Зотов О.А.» с торговой маркой «Хрумка».',
      'Орехи продавались уже не только на рынках: появились склады, фасовочные цеха, станки и печи для отборки и сушки ядер перед поставкой в магазины и супермаркеты.',
    ],
    image: history2007,
    side: 'right',
  },
  {
    id: 'history-2014',
    year: '2014',
    title: 'Открытие кулинарии',
    paragraphs: [
      'В 2014 году рядом с домом было построено и открыто двухэтажное здание «Кулинария Гармония», символом которого стала белка.',
      'Именно здесь начала формироваться семейная пекарня с вниманием к качеству ингредиентов и желанием готовить по-домашнему, с душой. А если взглянуть на здание, уютно расположившееся среди елей, становится понятно, почему именно белочка стала его символом.',
    ],
    image: history2014,
    side: 'left',
  },
  {
    id: 'history-2026',
    year: '2026',
    title: 'Преемственность поколений',
    paragraphs: [
      'Семейное дело продолжает Зотов Александр Олегович. Он развивает собственное производство: расширяет ассортимент, совершенствует процессы и при этом сохраняет домашний вкус и качество, с которых начиналось семейное дело.',
      'Основным ассортиментом как и раньше остаётся то, что любит семья: Медовый торт, «Дамские пальчики», домашняя выпечка и десерты для особых событий.',
      'История, начавшаяся в 1992 году, продолжается под новым именем - ZOTOV Bakery.',
    ],
    image: history2026,
    side: 'right',
  },
];
