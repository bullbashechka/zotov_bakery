/** Shared interruption rules for decorative entrances, independent of animation libraries. */
const subscribers = new Set<() => void>();
let events: AbortController | undefined;
export function onEntranceInterruption(finish: () => void): () => void {
  subscribers.add(finish);
  if (!events) {
    events = new AbortController();
    const signal = events.signal;
    let lastY = scrollY;
    let lastTime = performance.now();
    const complete = () => subscribers.forEach((callback) => callback());
    window.addEventListener('scroll', () => {
      const now = performance.now();
      if (Math.abs(scrollY - lastY) > innerHeight / 2) {
        complete();
        lastY = scrollY;
        lastTime = now;
      } else if (now - lastTime > 200) {
        lastY = scrollY;
        lastTime = now;
      }
    }, { passive: true, signal });
    window.addEventListener('hashchange', complete, { signal });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) complete();
    }, { signal });
    for (const name of ['focusin', 'pointerdown']) document.addEventListener(name, complete, { signal });
  }
  return () => {
    subscribers.delete(finish);
    if (!subscribers.size) {
      events?.abort();
      events = undefined;
    }
  };
}
