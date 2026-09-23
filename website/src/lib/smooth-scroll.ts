import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const activeRoots = new WeakMap<Document, () => void>();

/** Keeps inertial desktop scrolling and animates in-page navigation through the same scroller. */
export function initSmoothScroll(root: Document): () => void {
  const existingCleanup = activeRoots.get(root);
  if (existingCleanup) return existingCleanup;

  const wrapper = root.querySelector<HTMLElement>('#smooth-wrapper');
  const content = root.querySelector<HTMLElement>('#smooth-content');
  if (!wrapper || !content) return () => {};

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  const media = gsap.matchMedia();
  let smoother: ScrollSmoother | undefined;
  let navigation: gsap.core.Tween | undefined;

  const stopNavigation = () => {
    navigation?.kill();
    navigation = undefined;
  };

  const handleAnchorClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;

    const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || link.target || !link.hash) return;

    let target: HTMLElement | null;
    try {
      target = root.getElementById(decodeURIComponent(link.hash.slice(1)));
    } catch {
      return;
    }
    if (!target) return;

    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);

    // Mobile navigation releases its scroll lock in the link's click handler.
    requestAnimationFrame(() => {
      stopNavigation();
      const offsetProbe = root.createElement('div');
      offsetProbe.style.cssText = 'position:absolute;height:var(--header-offset);visibility:hidden;pointer-events:none';
      root.body.append(offsetProbe);
      const margin = offsetProbe.getBoundingClientRect().height;
      offsetProbe.remove();
      const end = Math.max(0, (smoother
        ? smoother.offset(target, 'top top')
        : target.getBoundingClientRect().top + window.scrollY) - margin);
      const start = smoother ? smoother.scrollTop() : window.scrollY;
      const setScroll = (value: number) => {
        if (smoother) smoother.scrollTop(value);
        else window.scrollTo({ top: value, behavior: 'instant' });
      };

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setScroll(end);
        return;
      }

      if (smoother) {
        smoother.scrollTo(end, true);
        return;
      }

      const position = { value: start };
      navigation = gsap.to(position, {
        value: end,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => setScroll(position.value),
        onComplete: () => { navigation = undefined; },
      });
    });
  };

  root.addEventListener('click', handleAnchorClick);
  window.addEventListener('wheel', stopNavigation, { passive: true });
  window.addEventListener('touchstart', stopNavigation, { passive: true });

  media.add(
    '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
    () => {
      root.documentElement.dataset.smoothScroll = 'true';
      smoother = ScrollSmoother.create({
        wrapper,
        content,
        smooth: 1.4,
        smoothTouch: false,
        effects: false,
        ignoreMobileResize: true,
      });

      return () => {
        stopNavigation();
        delete root.documentElement.dataset.smoothScroll;
        smoother?.kill();
        smoother = undefined;
      };
    },
  );

  const cleanup = () => {
    stopNavigation();
    root.removeEventListener('click', handleAnchorClick);
    window.removeEventListener('wheel', stopNavigation);
    window.removeEventListener('touchstart', stopNavigation);
    media.revert();
    activeRoots.delete(root);
  };
  activeRoots.set(root, cleanup);
  return cleanup;
}
