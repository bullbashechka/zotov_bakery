type ScrollRevealElement = HTMLElement & {
  dataset: HTMLElement['dataset'] & {
    scrollReveal?: string;
    revealDelay?: string;
  };
};

const REVEALED = 'true';

export const initScrollReveal = (root: ParentNode, selector = '[data-scroll-reveal]') => {
  const elements = Array.from(root.querySelectorAll<ScrollRevealElement>(selector));

  if (elements.length === 0) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer: IntersectionObserver | undefined;

  const reveal = (element: ScrollRevealElement) => {
    element.dataset.revealRevealed = REVEALED;
  };

  elements.forEach((element) => {
    element.dataset.revealReady = REVEALED;
    const delay = Number.parseInt(element.dataset.revealDelay ?? '0', 10);

    if (Number.isFinite(delay) && delay > 0) {
      element.style.setProperty('--reveal-delay', `${delay}ms`);
    }
  });

  const revealAll = () => {
    elements.forEach(reveal);
  };

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          reveal(entry.target as ScrollRevealElement);
          observer?.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -15% 0px', threshold: 0.15 },
    );

    elements.forEach((element) => observer?.observe(element));
  }

  const handleMotionChange = (event: MediaQueryListEvent) => {
    if (event.matches) {
      observer?.disconnect();
      revealAll();
    }
  };

  reducedMotion.addEventListener('change', handleMotionChange);

  return () => {
    observer?.disconnect();
    reducedMotion.removeEventListener('change', handleMotionChange);
  };
};
