import { gsap } from 'gsap';

const INTERVAL = 9_000;

export class CakeCarousel extends HTMLElement {
  private events: AbortController | null = null;
  private observer: IntersectionObserver | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private products: HTMLElement[] = [];
  private photos: HTMLElement[] = [];
  private panels: HTMLElement[] = [];
  private ingredients: HTMLDetailsElement[] = [];
  private active = 0;
  private paused = false;
  private visible = false;
  private hovering = false;
  private keyboardFocus = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private desktop = window.matchMedia('(min-width: 64rem)');
  private gesture: { id: number; x: number; y: number; dx: number; horizontal: boolean; target: HTMLElement } | null = null;
  private suppressClickUntil = 0;

  connectedCallback() {
    if (this.events) return;
    this.products = Array.from(this.querySelectorAll<HTMLElement>('[data-product]'));
    this.photos = Array.from(this.querySelectorAll<HTMLElement>('[data-photo]'));
    this.panels = Array.from(this.querySelectorAll<HTMLElement>('[data-panel]'));
    this.ingredients = Array.from(this.querySelectorAll<HTMLDetailsElement>('details'));
    if (this.products.length < 2) return;
    this.events = new AbortController();
    const { signal } = this.events;
    this.paused = this.reduced.matches;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-roledescription', 'карусель');
    this.dataset.enhanced = '';
    this.querySelector<HTMLElement>('[data-controls]')!.hidden = false;
    this.photos.forEach((photo, index) => {
      photo.setAttribute('role', 'button');
      photo.tabIndex = 0;
      photo.setAttribute('aria-label', `Показать: ${this.products[index].dataset.name}`);
    });
    this.syncIngredients();
    this.render(false);

    this.addEventListener('click', this.onClick, { signal });
    this.addEventListener('keydown', this.onKeydown, { signal });
    this.addEventListener('pointerdown', this.onPointerDown, { signal });
    this.addEventListener('pointermove', this.onPointerMove, { signal });
    this.addEventListener('pointerup', this.onPointerUp, { signal });
    this.addEventListener('pointercancel', this.cancelGesture, { signal });
    this.addEventListener('lostpointercapture', this.cancelGesture, { signal });
    this.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      this.hovering = true;
      this.schedule();
    }, { signal });
    this.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      this.hovering = false;
      this.schedule();
    }, { signal });
    this.addEventListener('focusin', (event) => {
      this.keyboardFocus = (event.target as HTMLElement).matches(':focus-visible');
      this.schedule();
    }, { signal });
    this.addEventListener('focusout', () => queueMicrotask(() => {
      if (signal.aborted) return;
      if (!this.contains(document.activeElement)) this.keyboardFocus = false;
      this.schedule();
    }), { signal });
    this.ingredients.forEach((details) => details.addEventListener('toggle', () => {
      if (this.desktop.matches || !this.panels[this.active].contains(details)) return;
      // Keep expansion consistent across slides, so a switch doesn't collapse the layout.
      this.ingredients.forEach((item) => { item.open = details.open; });
    }, { signal }));
    this.desktop.addEventListener('change', this.syncIngredients, { signal });
    this.reduced.addEventListener('change', () => {
      this.pause();
      this.render(false);
    }, { signal });
    document.addEventListener('visibilitychange', () => this.schedule(), { signal });
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    }, { threshold: 0 });
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.events?.abort();
    this.events = null;
    this.observer?.disconnect();
    clearTimeout(this.timer);
    gsap.killTweensOf(this.photos);
    this.gesture = null;
  }

  private syncIngredients = () => {
    this.ingredients.forEach((details) => {
      details.open = this.desktop.matches;
      details.querySelector('summary')!.tabIndex = this.desktop.matches ? -1 : 0;
    });
  };

  private schedule() {
    clearTimeout(this.timer);
    if (this.paused || !this.visible || this.hovering || this.keyboardFocus || document.hidden || this.gesture) return;
    this.timer = setTimeout(() => this.select(this.active + 1, false), INTERVAL);
  }

  private updatePlayback() {
    this.querySelector('[data-play]')!.setAttribute('aria-label', this.paused ? 'Продолжить автосмену' : 'Приостановить автосмену');
    this.querySelector('[data-play-label]')!.textContent = this.paused ? 'Продолжить' : 'Пауза';
    this.querySelector('[data-play-icon]')!.textContent = this.paused ? '▷' : 'Ⅱ';
    this.schedule();
  }

  private pause() {
    this.paused = true;
    this.updatePlayback();
  }

  private select(index: number, manual = true) {
    if (manual) this.pause();
    this.active = (index + this.products.length) % this.products.length;
    this.render(!this.reduced.matches);
    if (manual) this.querySelector('[data-announcement]')!.textContent = `${this.products[this.active].dataset.name}. ${this.active + 1} из ${this.products.length}`;
    this.schedule();
  }

  private render(animate: boolean) {
    this.photos.forEach((photo, index) => {
      const offset = (index - this.active + this.products.length) % this.products.length;
      const position = offset === 0 ? 0 : offset <= this.products.length / 2 ? 1 : -1;
      photo.dataset.position = String(position);
      photo.setAttribute('aria-pressed', String(index === this.active));
      photo.style.zIndex = String(position === 0 ? 3 : 1);
      gsap.killTweensOf(photo);
      const props = { x: 0, xPercent: position * 45, scale: position === 0 ? 1 : 0.76, opacity: 1 };
      if (animate) gsap.to(photo, { ...props, duration: 0.65, ease: 'power3.inOut', overwrite: true });
      else gsap.set(photo, props);
      const panel = this.panels[index];
      panel.toggleAttribute('data-active', index === this.active);
      panel.inert = index !== this.active;
      panel.setAttribute('aria-hidden', String(index !== this.active));
    });
    this.querySelector('[data-counter]')!.textContent = `${this.active + 1} / ${this.products.length}`;
    this.updatePlayback();
  }

  private onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-play]')) {
      this.paused = !this.paused;
      this.updatePlayback();
    } else if (target.closest('[data-previous]')) this.select(this.active - 1);
    else if (target.closest('[data-next]')) this.select(this.active + 1);
    else if (target.closest('summary')) {
      if (this.desktop.matches) event.preventDefault();
      else this.pause();
    } else if (target.closest('[data-photo]')) {
      if (performance.now() < this.suppressClickUntil) return;
      const photo = target.closest<HTMLElement>('[data-photo]')!;
      this.select(Number(photo.dataset.index));
    }
  };

  private onKeydown = (event: KeyboardEvent) => {
    this.keyboardFocus = true;
    this.schedule();
    const target = event.target as HTMLElement;
    if (!target.closest('[data-photo], [data-controls]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.select(this.active + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (target.closest('[data-photo]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.select(Number(target.closest<HTMLElement>('[data-photo]')!.dataset.index));
    }
  };

  private onPointerDown = (event: PointerEvent) => {
    const photo = (event.target as HTMLElement).closest<HTMLElement>('[data-photo]');
    if (!photo || event.button !== 0 || !event.isPrimary) return;
    this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false, target: photo };
    this.schedule();
  };

  private onPointerMove = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { this.cancelGesture(); return; }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      gesture.horizontal = true;
      gesture.target.setPointerCapture(event.pointerId);
      this.pause();
      gsap.killTweensOf(this.photos);
    }
    gesture.dx = dx;
    if (!this.reduced.matches) gsap.set(this.photos, { x: gsap.utils.clamp(-70, 70, dx * 0.4) });
  };

  private onPointerUp = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || gesture.id !== event.pointerId) return;
    this.gesture = null;
    if (gesture.horizontal) {
      this.suppressClickUntil = performance.now() + 400;
      this.select(this.active + (Math.abs(gesture.dx) >= 35 ? gesture.dx < 0 ? 1 : -1 : 0));
    }
    this.schedule();
  };

  private cancelGesture = () => {
    if (!this.gesture) return;
    this.gesture = null;
    this.render(false);
  };
}
