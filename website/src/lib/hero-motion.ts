import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

/** A single entrance composition, with real responsive line masks. */
export function initHeroMotion(root: ParentNode): () => void {
  const hero = root.querySelector<HTMLElement>('[data-hero-entrance]');
  const title = hero?.querySelector<HTMLElement>('.hero__title');
  if (!hero || !title || hero.dataset.heroEntrance !== 'pending') return () => {};

  const events = new AbortController();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let split: SplitText | undefined;
  let timeline: gsap.core.Timeline | undefined;
  let context: gsap.Context | undefined;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    timeline?.progress(1).pause();
    split?.revert();
    context?.revert();
    hero.dataset.heroEntrance = 'complete';
    events.abort();
  };

  hero.addEventListener('focusin', finish, { signal: events.signal });
  hero.addEventListener('pointerdown', finish, { signal: events.signal });
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) finish();
  }, { signal: events.signal, passive: true });
  window.addEventListener('pagehide', finish, { signal: events.signal });
  motion.addEventListener('change', (event) => {
    if (event.matches) finish();
  }, { signal: events.signal });

  void document.fonts.ready.then(() => {
    if (finished || motion.matches || hero.dataset.heroEntrance !== 'pending') {
      finish();
      return;
    }

    gsap.registerPlugin(SplitText);
    const mobile = window.innerWidth < 768;
    context = gsap.context(() => {}, hero);
    context.add(() => {
      split = SplitText.create(title, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'hero__text-line',
        reduceWhiteSpace: false,
        autoSplit: true,
        aria: 'auto',
        onSplit(self) {
          timeline = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
          timeline.fromTo(self.lines,
            { yPercent: 110 },
            { yPercent: 0, duration: 1.05, stagger: 0.13, ease: 'power4.out' },
            0.2,
          );
          timeline.fromTo('.hero__cake-motion',
            { y: mobile ? 14 : 28, rotation: mobile ? -2 : -4, scale: 0.96, opacity: 0.25 },
            { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.2)' },
            0,
          );
          timeline.fromTo('[data-hero-crumb]',
            { y: mobile ? -8 : -16, rotation: -20, opacity: 0 },
            { y: 0, rotation: 0, opacity: 0.8, duration: 0.6, stagger: 0.07 }, 0.25);
          timeline.fromTo('.hero__intro',
            { y: mobile ? 12 : 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.75 },
            0.45,
          );
          // The buttons never move away from their clickable area or become inert.
          timeline.fromTo('.hero__actions',
            { opacity: 0.4 },
            { opacity: 1, duration: 0.55 },
            0.65,
          );
          return timeline;
        },
      });
    });
    hero.dataset.heroEntrance = 'active';
  }).catch(finish);

  return finish;
}
