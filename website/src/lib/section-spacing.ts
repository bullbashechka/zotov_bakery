const activeRoots = new WeakMap<ParentNode, () => void>();

type SpacingPair = {
  end: HTMLElement;
  title: HTMLElement;
  target: HTMLElement;
};

/**
 * Keeps the perceived space between the final content fragment of one section
 * and the next section title independent from section-specific decoration.
 */
export function initSectionSpacing(root: ParentNode): () => void {
  const existingCleanup = activeRoots.get(root);
  if (existingCleanup) return existingCleanup;

  const ends = Array.from(root.querySelectorAll<HTMLElement>('[data-section-end]'));
  const titles = Array.from(root.querySelectorAll<HTMLElement>('[data-section-title]'));
  const pairs: SpacingPair[] = [];

  ends.forEach((end, index) => {
    const title = titles[index];
    const target = title?.closest<HTMLElement>('[data-section-spacing-target]');
    if (title && target) pairs.push({ end, title, target });
  });

  if (pairs.length !== ends.length || pairs.length !== titles.length) return () => {};

  const probe = document.createElement('div');
  probe.className = 'section-spacing-probe';
  probe.setAttribute('aria-hidden', 'true');
  document.body.append(probe);

  let frame = 0;
  const apply = () => {
    frame = 0;
    pairs.forEach(({ target }) => target.style.setProperty('--section-heading-gap-adjust', '0px'));

    // Force the zeroed baseline to be laid out before every pair is measured.
    void probe.offsetHeight;
    const desiredGap = probe.getBoundingClientRect().height;

    pairs.forEach(({ end, title, target }) => {
      const actualGap = title.getBoundingClientRect().top - end.getBoundingClientRect().bottom;
      const adjustment = Math.round((desiredGap - actualGap) * 1000) / 1000;
      target.style.setProperty('--section-heading-gap-adjust', `${adjustment}px`);
    });
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(apply);
  };

  const observer = new ResizeObserver(schedule);
  pairs.forEach(({ end, title }) => {
    observer.observe(end);
    observer.observe(title);
  });
  window.addEventListener('resize', schedule, { passive: true });
  document.fonts?.ready.then(schedule).catch(() => {});
  schedule();

  const cleanup = () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    probe.remove();
    pairs.forEach(({ target }) => target.style.removeProperty('--section-heading-gap-adjust'));
    activeRoots.delete(root);
  };
  activeRoots.set(root, cleanup);
  return cleanup;
}
