import { gsap } from 'gsap';

type Gesture = {
  id: number; x: number; y: number; dx: number; start: number; target: number;
  horizontal: boolean; element: HTMLElement; lastX: number; lastTime: number; velocity: number;
};

export class CakeCarousel extends HTMLElement {
  private events: AbortController | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private products: HTMLElement[] = [];
  private photos: HTMLButtonElement[] = [];
  private panels: HTMLElement[] = [];
  private ingredients: HTMLDetailsElement[] = [];
  private media: HTMLElement | null = null;
  private active = 0;
  private target = 0;
  private motion = { position: 0 };
  private movement: gsap.core.Tween | null = null;
  private transition: gsap.core.Timeline | null = null;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private desktop = window.matchMedia('(min-width: 64rem)');
  private gesture: Gesture | null = null;
  private suppressClickUntil = 0;

  connectedCallback() {
    if (this.events) return;
    this.products = Array.from(this.querySelectorAll<HTMLElement>('[data-product]'));
    this.photos = Array.from(this.querySelectorAll<HTMLButtonElement>('[data-photo]'));
    this.panels = Array.from(this.querySelectorAll<HTMLElement>('[data-panel]'));
    this.ingredients = Array.from(this.querySelectorAll<HTMLDetailsElement>('details'));
    this.media = this.querySelector<HTMLElement>('[data-media-deck]');
    if (!this.products.length || this.products.length !== this.photos.length || this.products.length !== this.panels.length || !this.media) return;
    this.events = new AbortController();
    const { signal } = this.events;
    this.setAttribute('role', 'group');
    this.setAttribute('aria-roledescription', 'карусель');
    this.dataset.enhanced = '';
    this.photos.forEach((photo, index) => photo.setAttribute('aria-label', `Показать: ${this.products[index].dataset.name}`));
    this.syncIngredients();
    this.motion.position = this.target;
    this.syncContent(false);
    this.draw();
    this.addEventListener('click', this.onClick, { signal });
    this.addEventListener('keydown', this.onKeydown, { signal });
    this.addEventListener('pointerdown', this.onPointerDown, { signal });
    this.addEventListener('pointermove', this.onPointerMove, { signal });
    this.addEventListener('pointerup', this.onPointerUp, { signal });
    this.addEventListener('pointercancel', this.cancelGesture, { signal });
    this.addEventListener('lostpointercapture', this.cancelGesture, { signal });
    this.ingredients.forEach((details) => details.addEventListener('toggle', () => {
      if (this.desktop.matches || !this.panels[this.active].contains(details)) return;
      this.ingredients.forEach((item) => { item.open = details.open; });
    }, { signal }));
    this.desktop.addEventListener('change', this.syncIngredients, { signal });
    this.reduced.addEventListener('change', () => {
      this.cancelGesture();
      this.select(this.target);
      this.syncContent(false);
    }, { signal });
    this.resizeObserver = new ResizeObserver(() => { this.cancelGesture(); this.draw(); });
    this.resizeObserver.observe(this.media);
  }

  disconnectedCallback() {
    this.events?.abort();
    this.events = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.movement?.kill();
    this.transition?.kill();
    this.releaseGesture();
  }

  private syncIngredients = () => {
    this.ingredients.forEach((details) => {
      details.open = this.desktop.matches;
      details.querySelector('summary')!.tabIndex = this.desktop.matches ? -1 : 0;
    });
  };

  private wrap(index: number) {
    return ((index % this.products.length) + this.products.length) % this.products.length;
  }

  // A continuous position owns the whole deck, including drag and interrupted moves.
  private draw = () => {
    if (!this.media) return;
    const width = this.media.clientWidth;
    this.photos.forEach((photo, index) => {
      const angle = (index - this.motion.position) * 2 * Math.PI / this.photos.length;
      const depth = (Math.cos(angle) + 1) / 2;
      const scale = 0.68 + 0.32 * depth;
      const x = Math.sin(angle) * width * 0.28;
      photo.style.transform = `translate(-50%, -50%) translateX(${x}px) scale(${scale})`;
      photo.style.zIndex = String(Math.round(depth * 100) + 1);
      photo.style.opacity = String(0.25 + 0.75 * Math.pow(depth, 0.95));
    });
  };

  private select(target: number) {
    this.movement?.kill();
    this.target = target;
    const previous = this.active;
    this.active = this.wrap(target);
    if (previous !== this.active) this.syncContent(!this.reduced.matches, previous);
    if (this.reduced.matches) {
      this.motion.position = target;
      this.draw();
      return;
    }
    this.movement = gsap.to(this.motion, {
      position: target,
      duration: Math.min(0.72, 0.44 + Math.abs(target - this.motion.position) * 0.14),
      ease: 'power3.out',
      onUpdate: this.draw,
    });
  }

  private syncContent(animate: boolean, previous?: number) {
    this.transition?.kill();
    this.transition = null;
    gsap.set(this.panels, { clearProps: 'opacity,transform,visibility' });
    this.panels.forEach((panel, index) => {
      const active = index === this.active;
      panel.toggleAttribute('data-active', active);
      panel.inert = !active;
      panel.setAttribute('aria-hidden', String(!active));
      this.photos[index].setAttribute('aria-pressed', String(active));
      this.photos[index].dataset.slot = active ? 'active' : 'side';
    });
    const counter = this.querySelector('[data-counter]');
    if (counter) counter.textContent = `${String(this.active + 1).padStart(2, '0')} / ${String(this.products.length).padStart(2, '0')}`;
    if (previous !== undefined) this.querySelector('[data-announcement]')!.textContent = `${this.products[this.active].dataset.name}. ${this.active + 1} из ${this.products.length}`;
    if (!animate) return;
    const incoming = this.panels[this.active];
    const outgoing = previous === undefined ? null : this.panels[previous];
    const timeline = gsap.timeline();
    this.transition = timeline;
    if (outgoing) {
      gsap.set(outgoing, { autoAlpha: 1, y: 0 });
      timeline.to(outgoing, { autoAlpha: 0, y: -6, duration: 0.12, ease: 'power2.out' }, 0);
    }
    gsap.set(incoming, { autoAlpha: 0, y: 7 });
    timeline.to(incoming, { autoAlpha: 1, y: 0, duration: 0.26, ease: 'power2.out' }, 0.12);
    timeline.set(this.panels, { clearProps: 'opacity,transform,visibility' });
  }

  private onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('summary')) {
      if (this.desktop.matches) event.preventDefault();
      return;
    }
    const control = target.closest<HTMLElement>('[data-direction]');
    if (control) return this.select(this.target + Number(control.dataset.direction));
    const photo = target.closest<HTMLButtonElement>('[data-photo]');
    if (!photo || performance.now() < this.suppressClickUntil) return;
    const count = this.photos.length;
    const index = Number(photo.dataset.index);
    const distance = this.wrap(index - this.motion.position + count / 2) - count / 2;
    this.select(Math.round(this.motion.position + distance));
  };

  private onKeydown = (event: KeyboardEvent) => {
    if (!(event.target as HTMLElement).closest('[data-photo], [data-direction]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.select(this.target + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };

  private onPointerDown = (event: PointerEvent) => {
    const photo = (event.target as HTMLElement).closest<HTMLElement>('[data-photo]');
    if (!photo || event.button !== 0 || !event.isPrimary) return;
    this.gesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0,
      start: this.motion.position, target: this.target, horizontal: false, element: photo,
      lastX: event.clientX, lastTime: event.timeStamp, velocity: 0,
    };
  };

  private onPointerMove = (event: PointerEvent) => {
    const gesture = this.gesture;
    if (!gesture || gesture.id !== event.pointerId || !this.media) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) return this.cancelGesture();
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      gesture.horizontal = true;
      this.movement?.kill();
      gesture.start = this.motion.position;
      gesture.element.setPointerCapture(event.pointerId);
      this.media.dataset.dragging = '';
    }
    gesture.velocity = (event.clientX - gesture.lastX) / Math.max(1, event.timeStamp - gesture.lastTime);
    gesture.lastX = event.clientX;
    gesture.lastTime = event.timeStamp;
    gesture.dx = dx;
    this.motion.position = gesture.start - dx / (this.media.clientWidth * 0.55);
    this.draw();
  };

  private releaseGesture() {
    const gesture = this.gesture;
    this.gesture = null;
    if (this.media) delete this.media.dataset.dragging;
    if (gesture?.element.hasPointerCapture(gesture.id)) gesture.element.releasePointerCapture(gesture.id);
    return gesture;
  }

  private onPointerUp = (event: PointerEvent) => {
    if (this.gesture?.id !== event.pointerId) return;
    const gesture = this.releaseGesture();
    if (!gesture?.horizontal || !this.media) return;
    this.suppressClickUntil = performance.now() + 400;
    const flick = event.timeStamp - gesture.lastTime < 100 && Math.abs(gesture.velocity) > 0.4;
    const move = Math.abs(gesture.dx) > this.media.clientWidth * 0.12 || flick;
    this.select(move ? Math.round(gesture.start) + (gesture.dx < 0 ? 1 : -1) : Math.round(gesture.start));
  };

  private cancelGesture = () => {
    const gesture = this.releaseGesture();
    if (!gesture?.horizontal) return;
    this.suppressClickUntil = performance.now() + 400;
    this.select(gesture.target);
  };
}
