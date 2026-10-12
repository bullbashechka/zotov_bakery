const media = document.querySelector('[data-hero-media]');
const image = media?.querySelector('img');

if (media && image && !image.complete) {
  const fallback = () => {
    media.dataset.error = 'true';
    image.hidden = true;
  };
  image.addEventListener('error', fallback, { once: true });
} else if (media && image && image.complete && image.naturalWidth === 0) {
  media.dataset.error = 'true';
  image.hidden = true;
}

document.querySelectorAll('.hero__actions a').forEach((link) => {
  link.addEventListener('click', () => {
    const targetId = link.getAttribute('href');
    const target = targetId ? document.querySelector(targetId) : null;

    if (!target) return;

    window.setTimeout(() => {
      const heading = target.querySelector('h1, h2, h3, h4, h5, h6');
      if (!heading) return;

      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }, 0);
  });
});
