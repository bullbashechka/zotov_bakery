const STORAGE_KEY = 'zotov:analytics-consent';
const CONSENT_VERSION = 1;
const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;

type ConsentChoice = 'allowed' | 'denied';
type StoredConsent = { choice: ConsentChoice; version: number; expiresAt: number };

declare global {
  interface Window {
    ym?: ((counterId: number, method: string, ...args: unknown[]) => void) & {
      a?: IArguments[];
      l?: number;
    };
  }
}

function readConsent(): ConsentChoice | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as Partial<StoredConsent>;
    if (
      parsed.version !== CONSENT_VERSION ||
      !['allowed', 'denied'].includes(parsed.choice ?? '') ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Date.now()
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return parsed.choice;
  } catch {
    return undefined;
  }
}

function writeConsent(choice: ConsentChoice): boolean {
  try {
    const value: StoredConsent = {
      choice,
      version: CONSENT_VERSION,
      expiresAt: Date.now() + CONSENT_TTL_MS,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function clearMetrikaCookies() {
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter((name) => name && /^(?:_ym|_yasc|yandexuid)/.test(name));
  const domains = [location.hostname, `.${location.hostname}`];
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
    }
  }
}

function goalForLink(link: HTMLAnchorElement): string | undefined {
  const href = link.href;
  if (href.startsWith('tel:')) return 'phone_click';
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  if (url.hostname === 'wa.me') return 'whatsapp_click';
  if (url.hostname.endsWith('instagram.com')) return 'instagram_click';
  if (url.hostname.endsWith('2gis.kz')) {
    return url.pathname.includes('/search/') ? 'map_aimer_click' : 'map_bakery_click';
  }
  return undefined;
}

function loadMetrika(counterId: number) {
  if (document.querySelector('[data-yandex-metrika]')) return;
  window.ym =
    window.ym ||
    function (...args: unknown[]) {
      (window.ym!.a = window.ym!.a || []).push(args as unknown as IArguments);
    };
  window.ym.l = Date.now();

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  script.dataset.yandexMetrika = 'true';
  document.head.append(script);

  window.ym(counterId, 'init', {
    clickmap: false,
    trackLinks: false,
    accurateTrackBounce: true,
    webvisor: false,
  });
}

export function initAnalyticsConsent(scope: Document): () => void {
  const root = scope.querySelector<HTMLElement>('[data-cookie-consent]');
  const settings = [...scope.querySelectorAll<HTMLButtonElement>('[data-cookie-settings]')];
  if (!root) {
    settings.forEach((button) => (button.hidden = true));
    return () => {};
  }

  const counterId = Number(root.dataset.counterId);
  const allow = root.querySelector<HTMLButtonElement>('[data-cookie-allow]');
  const deny = root.querySelector<HTMLButtonElement>('[data-cookie-deny]');
  if (!Number.isSafeInteger(counterId) || counterId <= 0 || !allow || !deny) return () => {};

  const controller = new AbortController();
  const { signal } = controller;
  let choice = readConsent();

  const show = () => {
    root.hidden = false;
  };
  const hide = () => {
    root.hidden = true;
  };
  const choose = (next: ConsentChoice) => {
    const previous = choice;
    choice = next;
    writeConsent(next);
    hide();
    if (next === 'allowed') loadMetrika(counterId);
    if (next === 'denied') {
      clearMetrikaCookies();
      if (previous === 'allowed') location.reload();
    }
  };

  if (choice === 'allowed') loadMetrika(counterId);
  else if (!choice) show();

  allow.addEventListener('click', () => choose('allowed'), { signal });
  deny.addEventListener('click', () => choose('denied'), { signal });
  settings.forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        show();
        allow.focus();
      },
      { signal },
    ),
  );
  scope.addEventListener(
    'click',
    (event) => {
      if (choice !== 'allowed') return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      const goal = link ? goalForLink(link) : undefined;
      if (goal) window.ym?.(counterId, 'reachGoal', goal);
    },
    { signal },
  );
  window.addEventListener(
    'storage',
    (event) => {
      if (event.key === STORAGE_KEY && event.newValue !== event.oldValue) location.reload();
    },
    { signal },
  );

  return () => controller.abort();
}
