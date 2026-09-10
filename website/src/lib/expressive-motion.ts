import { gsap } from 'gsap';
import { animate, svg } from 'animejs';

const roots = new WeakMap<ParentNode, () => void>();

/** Decorative scenes own separate targets from the page entrance animations. */
export function initExpressiveMotion(root: ParentNode): () => void {
  const previous = roots.get(root);
  if (previous) return previous;
  const media = gsap.matchMedia();
  const played = new WeakSet<Element>();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', fine: '(hover: hover) and (pointer: fine)' }, (context) => {
    if (!context.conditions?.motion) return;
    const fine = Boolean(context.conditions.fine);
    const events = new AbortController();
    const { signal } = events;
    const animations = new Set<ReturnType<typeof animate>>();
    const observers: IntersectionObserver[] = [];
    const disposers: (() => void)[] = [];
    const tween = (target: gsap.TweenTarget, vars: gsap.TweenVars) => {
      context.add(() => gsap.to(target, { duration: 0.22, overwrite: 'auto', ...vars }));
    };
    const onceVisible = (target: Element, play: () => void) => {
      if (played.has(target) || !('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        played.add(target);
        observer.disconnect();
        context.add(play);
      }, { threshold: 0.2 });
      observer.observe(target);
      observers.push(observer);
    };

    root.querySelectorAll<HTMLElement>('.action-link').forEach((button) => {
      button.dataset.interactiveMotion = 'true';
      let down = false;
      const restore = () => { down = false; tween(button, { scale: 1, ease: 'back.out(1.6)' }); };
      button.addEventListener('pointerdown', () => { down = true; tween(button, { scale: 0.97, duration: 0.12 }); }, { signal });
      window.addEventListener('pointerup', () => { if (down) restore(); }, { signal });
      button.addEventListener('pointercancel', restore, { signal });
      button.addEventListener('keydown', (event) => { if (event.key === 'Enter') tween(button, { scale: 0.97 }); }, { signal });
      button.addEventListener('keyup', restore, { signal });
      button.addEventListener('blur', restore, { signal });
      if (fine) {
        button.addEventListener('pointerenter', () => tween(button, { y: -2 }), { signal });
        button.addEventListener('pointerleave', () => tween(button, { y: 0 }), { signal });
      }
      disposers.push(() => button.removeAttribute('data-interactive-motion'));
    });

    root.querySelectorAll<HTMLElement>('.where-to-buy__card').forEach((card) => {
      const image = card.querySelector('img');
      let hovering = false;
      const update = () => {
        const active = hovering || card.contains(document.activeElement);
        // Individual translate does not compete with the entrance transform.
        tween(card, { translate: active ? '0px -4px' : '0px 0px' });
        if (image) tween(image, { scale: active ? 1.025 : 1 });
      };
      if (fine) {
        card.addEventListener('pointerenter', () => { hovering = true; update(); }, { signal });
        card.addEventListener('pointerleave', () => { hovering = false; update(); }, { signal });
      }
      card.addEventListener('focusin', update, { signal });
      card.addEventListener('focusout', () => queueMicrotask(() => { if (!signal.aborted) update(); }), { signal });
    });

    root.querySelectorAll<HTMLElement>('[data-advantages-card]').forEach((card, index) => {
      const art = card.querySelector<HTMLElement>('[data-motion-art]');
      if (!art) return;
      let running = false;
      const play = () => {
        if (running || document.hidden) return;
        running = true;
        const frames = [
          [{ rotate: -3 }, { rotate: 3 }, { rotate: 0 }],
          [{ rotate: -3 }, { rotate: 1 }, { rotate: 0 }],
          [{ scale: 0.94 }, { scale: 1.02 }, { scale: 1 }],
          [{ y: innerWidth < 768 ? -4 : -8 }, { y: 0 }],
        ][index % 4];
        const animation = animate(art, { keyframes: frames, duration: 750, ease: 'outQuad', onComplete: (self) => {
          running = false;
          self.revert();
          animations.delete(self);
        } });
        animations.add(animation);
      };
      onceVisible(card, play);
      if (fine) card.addEventListener('pointerenter', play, { signal });
    });

    const selection = root.querySelector<HTMLElement>('.conversion-section');
    const path = selection?.querySelector<SVGPathElement>('[data-selection-line] path');
    if (selection && path) {
      const crumb = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      crumb.setAttribute('r', '9');
      crumb.setAttribute('fill', '#6b3e22');
      crumb.style.opacity = '0';
      path.parentElement?.append(crumb);
      disposers.push(() => crumb.remove());
      onceVisible(selection, () => {
        const drawing = animate(svg.createDrawable(path), { draw: ['0 0', '0 1'], duration: 1200, ease: 'inOutQuad' });
        animations.add(drawing);
        crumb.style.opacity = '1';
        animations.add(animate(crumb, { ...svg.createMotionPath(path), duration: 1200, ease: 'inOutQuad', onComplete: () => { crumb.style.opacity = '0'; } }));
        const desserts = selection.querySelectorAll('[data-selection-dessert]');
        gsap.fromTo(desserts, { y: innerWidth < 768 ? 12 : 24, opacity: 0, rotation: (i: number) => i ? 3 : -3 },
          { y: 0, opacity: 1, rotation: 0, duration: 1, ease: 'back.out(1.1)', clearProps: 'transform,opacity' });
        const button = selection.querySelector('.action-link');
        if (button) gsap.to(button, { scale: 1.02, delay: 1.2, duration: 0.2, yoyo: true, repeat: 1, overwrite: 'auto' });
      });
    }

    return () => {
      events.abort();
      observers.forEach((observer) => observer.disconnect());
      animations.forEach((animation) => animation.revert());
      disposers.forEach((dispose) => dispose());
    };
  });
  const cleanup = () => { media.revert(); roots.delete(root); };
  roots.set(root, cleanup);
  return cleanup;
}
