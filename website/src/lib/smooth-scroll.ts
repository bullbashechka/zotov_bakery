import { gsap } from 'gsap';

const activeRoots = new WeakMap<Document, () => void>();

/** Animates in-page navigation while leaving normal page scrolling to the browser. */
export function initSmoothScroll(root: Document): () => void {
  const existingCleanup = activeRoots.get(root);
  if (existingCleanup) return existingCleanup;

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
      const end = Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin);
      const start = window.scrollY;
      const setScroll = (value: number) => window.scrollTo({ top: value, behavior: 'instant' });

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setScroll(end);
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

  const cleanup = () => {
    stopNavigation();
    root.removeEventListener('click', handleAnchorClick);
    window.removeEventListener('wheel', stopNavigation);
    window.removeEventListener('touchstart', stopNavigation);
    activeRoots.delete(root);
  };
  activeRoots.set(root, cleanup);
  return cleanup;
}
