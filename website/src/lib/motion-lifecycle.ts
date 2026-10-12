import { onEntranceInterruption } from './entrance-interruption';
import { gsap } from 'gsap';

interface Revertible {
  revert(): void;
}
interface MotionScope {
  element: HTMLElement;
  fine: boolean;
  mobile: boolean;
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
        mobile: '(max-width: 47.999rem)',
        fine: '(hover: hover) and (pointer: fine)',
      },
      (context) => {
        if (!context.conditions?.motion) return;
        const events = new AbortController();
        const animations = new Set<Revertible>();
        const cleanups: (() => void)[] = [];
        let observer: IntersectionObserver | undefined;
        let stopInterruptions = () => {};
        setup({
          element,
          fine: Boolean(context.conditions.fine),
          mobile: Boolean(context.conditions.mobile),
          signal: events.signal,
          context,
          onceVisible(play) {
            stopInterruptions = onEntranceInterruption(() => {
              played = true;
              observer?.disconnect();
              animations.forEach((animation) => animation.revert());
              animations.clear();
            });
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
          stopInterruptions();
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
