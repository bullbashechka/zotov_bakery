class SiteHeader extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === 'true') return;

    this.dataset.ready = 'true';
    this.toggle = this.querySelector('.site-header__menu-toggle');
    this.panel = this.querySelector('.site-header__mobile-panel');
    this.backdrop = this.querySelector('.site-header__backdrop');
    this.menuLinks = [...this.panel.querySelectorAll('a[href^="#"]')];
    this.desktopQuery = window.matchMedia('(min-width: 80rem)');
    this.events = new AbortController();
    this.compact = false;
    this.lockedScrollY = 0;

    this.panel.inert = true;
    this.panel.setAttribute('aria-hidden', 'true');

    this.handleToggle = () => this.setMenuOpen(this.dataset.menuOpen !== 'true');
    this.handleKeydown = (event) => {
      if (event.key === 'Escape' && this.dataset.menuOpen === 'true') {
        event.preventDefault();
        this.setMenuOpen(false, { restoreFocus: true });
        return;
      }

      if (event.key !== 'Tab' || this.dataset.menuOpen !== 'true') return;

      const focusable = [this.toggle, ...this.panel.querySelectorAll('a[href], button:not([disabled])')]
        .filter((element) => element && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    this.handleScroll = () => {
      if (this.dataset.menuOpen === 'true') return;

      const scrollY = window.scrollY;
      const nextCompact = this.compact ? scrollY > 8 : scrollY >= 32;

      if (nextCompact !== this.compact) {
        this.compact = nextCompact;
        this.toggleAttribute('data-compact', nextCompact);
        this.syncMascot();
      }
    };
    this.handleBreakpoint = () => {
      if (this.desktopQuery.matches) this.setMenuOpen(false);
      this.handleScroll();
    };

    this.toggle.addEventListener('click', this.handleToggle, { signal: this.events.signal });
    this.backdrop.addEventListener(
      'click',
      () => this.setMenuOpen(false, { restoreFocus: true }),
      { signal: this.events.signal },
    );
    window.addEventListener('keydown', this.handleKeydown, { signal: this.events.signal });
    window.addEventListener('scroll', this.handleScroll, {
      passive: true,
      signal: this.events.signal,
    });
    this.desktopQuery.addEventListener('change', this.handleBreakpoint, { signal: this.events.signal });

    this.menuLinks.forEach((link) => {
      link.addEventListener(
        'click',
        () => {
          const targetId = link.getAttribute('href');
          const target = targetId ? document.querySelector(targetId) : null;

          this.setMenuOpen(false);

          if (target) {
            window.setTimeout(() => {
              const heading = target.querySelector('h1, h2, h3, h4, h5, h6');
              if (!heading) return;

              heading.setAttribute('tabindex', '-1');
              heading.focus({ preventScroll: true });
              window.setTimeout(() => heading.removeAttribute('tabindex'), 1000);
            }, 0);
          }
        },
        { signal: this.events.signal },
      );
    });

    this.handleScroll();
  }

  disconnectedCallback() {
    this.events?.abort();
    this.unlockPageScroll();
  }

  syncMascot() {
    const mascot = this.querySelector('header-mascot');
    if (mascot)
      mascot.dataset.state =
        this.compact || this.dataset.menuOpen === 'true' ? 'compact' : 'expanded';
  }

  setMenuOpen(open, options = {}) {
    const { restoreFocus = false } = options;
    const isOpen = open && !this.desktopQuery.matches;

    this.dataset.menuOpen = String(isOpen);
    this.syncMascot();
    this.toggle.setAttribute('aria-expanded', String(isOpen));
    this.toggle.querySelector('.sr-only').textContent = isOpen ? 'Закрыть меню' : 'Открыть меню';
    this.panel.inert = !isOpen;
    this.panel.setAttribute('aria-hidden', String(!isOpen));

    if (isOpen) {
      this.lockPageScroll();
      window.setTimeout(() => this.menuLinks[0]?.focus({ preventScroll: true }), 0);
    } else {
      this.unlockPageScroll();
    }
    if (!isOpen && restoreFocus) this.toggle.focus({ preventScroll: true });
  }

  lockPageScroll() {
    if (document.documentElement.dataset.headerMenuOpen === 'true') return;

    this.lockedScrollY = window.scrollY;
    document.documentElement.dataset.headerMenuOpen = 'true';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.lockedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  unlockPageScroll() {
    if (document.documentElement.dataset.headerMenuOpen !== 'true') return;

    delete document.documentElement.dataset.headerMenuOpen;
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overflow');
    window.scrollTo({ top: this.lockedScrollY, behavior: 'instant' });
  }
}

if (!customElements.get('site-header')) customElements.define('site-header', SiteHeader);
