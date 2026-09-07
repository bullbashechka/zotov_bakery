import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

const activeRoots = new WeakMap<ParentNode, () => void>();

/** One-time page entrances; interactive controls retain their native behavior. */
export function initPageMotion(root: ParentNode): () => void {
  const existingCleanup = activeRoots.get(root);
  if (existingCleanup) return existingCleanup;

  const targets = Array.from(root.querySelectorAll<HTMLElement | SVGSVGElement>(
    '[data-motion], [data-motion-line]',
  ));
  if (!targets.length) return () => {};

  gsap.registerPlugin(ScrollTrigger, SplitText);
  const played = new WeakSet<Element>();
  const scenes = new Map<Element, gsap.core.Timeline>();
  const media = gsap.matchMedia();
  const events = new AbortController();

  const finish = (target: Element) => {
    played.add(target);
    scenes.get(target)?.progress(1).pause();
  };
  const finishRelated = (element: Element, includeDescendants = false) => {
    targets.forEach((target) => {
      if (target.contains(element) || (includeDescendants && element.contains(target))) finish(target);
    });
  };
  const finishHash = () => {
    if (!location.hash) return;
    try {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) finishRelated(target, true);
    } catch {
      // A malformed URL fragment must not affect page access.
    }
  };

  const finishInteraction = (event: Event) => {
    if (event.target instanceof Element) finishRelated(event.target);
  };
  root.addEventListener('focusin', finishInteraction, { signal: events.signal });
  root.addEventListener('pointerdown', finishInteraction, { signal: events.signal });
  window.addEventListener('hashchange', finishHash, { signal: events.signal });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) targets.forEach(finish);
  }, { signal: events.signal });
  finishHash();

  media.add({
    desktop: '(min-width: 48rem)',
    mobile: '(max-width: 47.999rem)',
    reduced: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    if (context.conditions?.reduced || !('IntersectionObserver' in window)) {
      targets.forEach(finish);
      return;
    }

    const mobile = Boolean(context.conditions?.mobile);
    const splits: SplitText[] = [];
    const observed = new Map<Element, Element[]>();
    const observer = new IntersectionObserver((entries) => {
      let cardDelay = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (observed.get(entry.target) ?? []).forEach((target) => {
          const timeline = scenes.get(target);
          if (!timeline || played.has(target)) return;
          played.add(target);
          const kind = target.getAttribute('data-motion');
          if (kind === 'card' || kind === 'answer') {
            timeline.delay(cardDelay);
            cardDelay += 0.12;
          } else if (kind === 'dessert-right') {
            timeline.delay(0.1);
          }
          timeline.restart(true);
        });
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });

    targets.forEach((target) => {
      if (played.has(target)) return;
      const bounds = target.getBoundingClientRect();
      // Hidden responsive variants keep their static appearance until needed.
      if (!bounds.width || !bounds.height) return;
      const initialStroke = target.hasAttribute('data-motion-line')
        && performance.now() < 1000 && window.scrollY === 0;
      if (bounds.top < window.innerHeight && bounds.left < window.innerWidth
        && bounds.right > 0 && !initialStroke) {
        played.add(target);
        return;
      }

      const kind = target.dataset.motion;
      const copy = target.querySelectorAll('[data-motion-copy]');
      if (kind === 'heading' && !copy.length) {
        // Animate only the generated lines: the heading can retain layout transforms
        // such as the rotated Contacts label. Revert restores the semantic HTML.
        splits.push(SplitText.create(target, {
          type: 'lines', mask: 'lines', linesClass: 'motion-line',
          autoSplit: true, reduceWhiteSpace: false, aria: 'auto',
          onSplit(self) {
            const timeline = gsap.timeline({ paused: true, onComplete: () => {
              self.revert();
              scenes.delete(target);
            } });
            timeline.fromTo(self.lines, { yPercent: 110 }, {
              yPercent: 0, duration: 1.05, stagger: 0.13, ease: 'power4.out',
            });
            scenes.set(target, timeline);
            if (played.has(target)) timeline.progress(1).pause();
            return timeline;
          },
        }));
      } else {
        const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
        scenes.set(target, timeline);
        if (target.hasAttribute('data-motion-line')) {
          const paths = Array.from(target.querySelectorAll('path'));
          paths.forEach((path, index) => {
            const length = path.getTotalLength();
            timeline.fromTo(path,
              { strokeDasharray: `${length} ${length}`, strokeDashoffset: length },
              { strokeDashoffset: 0, duration: 1.3 / paths.length, ease: 'power2.inOut' },
              index * (1.3 / paths.length),
            );
          });
        } else if (kind === 'heading') {
          timeline.fromTo(copy, { yPercent: 110 }, {
            yPercent: 0, duration: 0.95, stagger: 0.12, ease: 'power4.out', clearProps: 'transform',
          });
        } else if (kind === 'image' || kind === 'dessert-left' || kind === 'dessert-right') {
          const x = kind === 'dessert-left' ? -32 : kind === 'dessert-right' ? 32 : 0;
          timeline.fromTo(target,
            { x: mobile ? x / 2 : x, y: mobile ? 18 : 28, scale: 0.96, opacity: 0 },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.15, clearProps: 'transform,opacity' },
          );
        } else if (kind === 'card') {
          timeline.fromTo(target,
            { y: mobile ? 28 : 48, opacity: 0, clipPath: 'inset(8% 0 0 0 round 12px)' },
            { y: 0, opacity: 1, clipPath: 'inset(0% 0 0 0 round 12px)', duration: 0.95,
              clearProps: 'transform,opacity,clipPath' },
          );
          const art = target.querySelector('[data-motion-art]');
          if (art) timeline.fromTo(art, { scale: 0.92 }, {
            scale: 1, duration: 1, clearProps: 'transform',
          }, 0.15);
        } else {
          // No clipping on FAQ or text: focus outlines and answers may extend out.
          timeline.fromTo(target, { y: mobile ? 16 : 24, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.75, clearProps: 'transform,opacity',
          });
        }
      }

      const trigger = target.closest('[data-motion-group]')?.querySelector('[data-motion-trigger]') ?? target;
      const group = observed.get(trigger) ?? [];
      group.push(target);
      observed.set(trigger, group);
    });

    observed.forEach((group, trigger) => {
      observer.observe(trigger);
      ScrollTrigger.create({
        trigger, start: 'top 96%', end: 'bottom top',
        onLeave: () => { group.forEach(finish); observer.unobserve(trigger); },
        onLeaveBack: () => group.forEach((target) => { if (played.has(target)) finish(target); }),
      });
    });
    finishHash();
    return () => {
      observer.disconnect();
      splits.forEach((split) => split.revert());
      scenes.clear();
    };
  });

  // FAQ height and font changes move later scenes; refresh once the layout settles.
  let refreshTimer = 0;
  const layoutObserver = new ResizeObserver(() => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 100);
  });
  const layoutRoot = root instanceof Document ? root.body : root instanceof HTMLElement ? root : null;
  if (layoutRoot) layoutObserver.observe(layoutRoot);

  const cleanup = () => {
    events.abort();
    layoutObserver.disconnect();
    window.clearTimeout(refreshTimer);
    media.revert();
    scenes.clear();
    activeRoots.delete(root);
  };
  activeRoots.set(root, cleanup);
  return cleanup;
}
