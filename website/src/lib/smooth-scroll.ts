import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const activeRoots = new WeakMap<Document, () => void>();

/** Adds inertial desktop scrolling while keeping native scrolling as the fallback. */
export function initSmoothScroll(root: Document): () => void {
  const existingCleanup = activeRoots.get(root);
  if (existingCleanup) return existingCleanup;

  const wrapper = root.querySelector<HTMLElement>('#smooth-wrapper');
  const content = root.querySelector<HTMLElement>('#smooth-content');
  if (!wrapper || !content) return () => {};

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  const media = gsap.matchMedia();

  media.add(
    '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
    () => {
      root.documentElement.dataset.smoothScroll = 'true';
      const smoother = ScrollSmoother.create({
        wrapper,
        content,
        smooth: 0.8,
        smoothTouch: false,
        effects: false,
        ignoreMobileResize: true,
      });

      return () => {
        delete root.documentElement.dataset.smoothScroll;
        smoother.kill();
      };
    },
  );

  const cleanup = () => {
    media.revert();
    activeRoots.delete(root);
  };
  activeRoots.set(root, cleanup);
  return cleanup;
}
