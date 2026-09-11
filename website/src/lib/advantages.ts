export interface Advantage {
  kind: 'family' | 'history' | 'production' | 'ingredients';
  title: string;
  description: string;
  image: string;
}

export const ADVANTAGES = [
  {
    kind: 'family',
    title: 'Семейные рецепты',
    description: 'Сохраняем семейные рецепты и знакомый вкус любимых десертов.',
    image: '/advantages/family-recipes.svg',
  },
  {
    kind: 'history',
    title: 'Печём торты и десерты с 1992 года',
    description: 'Сохраняем проверенные рецептуры и совершенствуем производство более 30 лет.',
    image: '/advantages/baking-since-1992.svg',
  },
  {
    kind: 'production',
    title: 'Собственное производство',
    description: 'Контролируем каждый этап – от выбора ингредиентов до упаковки готового десерта.',
    image: '/advantages/own-production.svg',
  },
  {
    kind: 'ingredients',
    title: 'Натуральные ингредиенты',
    description: 'Используем натуральный мёд, сливочное масло и другие проверенные ингредиенты.',
    image: '/advantages/natural-ingredients.svg',
  },
] as const satisfies readonly Advantage[];
