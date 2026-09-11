declare const __ASTRO_DEV__: boolean;

/** Each frame runs the original Astro output, including custom-element lifecycle and assets. */
export function renderExample(component: string, example = 'default') {
  const frame = document.createElement('iframe');
  frame.className = 'component-preview';
  frame.title = `${component} — ${example}`;
  const origin = __ASTRO_DEV__
    ? `${window.location.protocol}//${window.location.hostname}:4322`
    : '';
  frame.src = `${origin}/components/${component}/${example}/`;
  return frame;
}
