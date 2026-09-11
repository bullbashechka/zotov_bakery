import { gsap } from 'gsap';

interface Revertible {
  revert(): void;
}
interface MotionScope {
  element: HTMLElement;
  fine: boolean;
  signal: AbortSignal;
  context: gsap.Context;
  onceVisible(play: () => void): void;
  track(animation: Revertible): void;
  untrack(animation: Revertible): void;
  onCleanup(dispose: () => void): void;
}

/** Lifecycle only. Components supply their own targets, keyframes and visual values. */
export function mountMotion(selector: string, setup: (scope: MotionScope) => void): () => void {
  const disposers: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    let played = false;
    const media = gsap.matchMedia();
    media.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        fine: '(hover: hover) and (pointer: fine)',
      },
      (context) => {
        if (!context.conditions?.motion) return;
        const events = new AbortController();
        const animations = new Set<Revertible>();
        const cleanups: (() => void)[] = [];
        let observer: IntersectionObserver | undefined;
        setup({
          element,
          fine: Boolean(context.conditions.fine),
          signal: events.signal,
          context,
          onceVisible(play) {
            if (played || !('IntersectionObserver' in window)) return;
            observer = new IntersectionObserver(
              (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                played = true;
                observer?.disconnect();
                context.add(play);
              },
              { threshold: 0.2 },
            );
            observer.observe(element);
          },
          track(animation) {
            animations.add(animation);
          },
          untrack(animation) {
            animations.delete(animation);
          },
          onCleanup(dispose) {
            cleanups.push(dispose);
          },
        });
        return () => {
          events.abort();
          observer?.disconnect();
          animations.forEach((animation) => animation.revert());
          cleanups.forEach((dispose) => dispose());
        };
      },
    );
    disposers.push(() => media.revert());
  });
  return () => disposers.forEach((dispose) => dispose());
}
