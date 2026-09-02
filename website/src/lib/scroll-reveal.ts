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
  const clipElements = elements.filter((element) => element.dataset.scrollReveal === 'clip');
  const fadeElements = elements.filter((element) => element.dataset.scrollReveal !== 'clip');
  const clipTriggers = new Map<HTMLElement, ScrollRevealElement[]>();
  let fadeObserver: IntersectionObserver | undefined;
  let clipObserver: IntersectionObserver | undefined;

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
    fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          reveal(entry.target as ScrollRevealElement);
          fadeObserver?.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -15% 0px', threshold: 0.15 },
    );

    fadeElements.forEach((element) => fadeObserver?.observe(element));

    clipElements.forEach((element) => {
      const trigger = element.parentElement ?? element;
      const targets = clipTriggers.get(trigger) ?? [];
      targets.push(element);
      clipTriggers.set(trigger, targets);
    });

    if (clipTriggers.size > 0) {
      clipObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            clipTriggers.get(entry.target as HTMLElement)?.forEach(reveal);
            clipObserver?.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -15% 0px', threshold: 0.01 },
      );

      clipTriggers.forEach((_, trigger) => clipObserver?.observe(trigger));
    }
  }

  const handleMotionChange = (event: MediaQueryListEvent) => {
    if (event.matches) {
      fadeObserver?.disconnect();
      clipObserver?.disconnect();
      revealAll();
    }
  };

  reducedMotion.addEventListener('change', handleMotionChange);

  return () => {
    fadeObserver?.disconnect();
    clipObserver?.disconnect();
    reducedMotion.removeEventListener('change', handleMotionChange);
  };
};
