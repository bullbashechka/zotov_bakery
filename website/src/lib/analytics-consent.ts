const STORAGE_KEY = 'zotov:analytics-consent';
const CONSENT_VERSION = 2;
const REFUSAL_COOKIE = 'zotov_analytics_denied';
const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;

type ConsentChoice = 'allowed' | 'denied';
type StoredConsent = { choice: ConsentChoice; version: number; expiresAt: number; services: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ym?: ((counterId: number, method: string, ...args: unknown[]) => void) & {
      a?: IArguments[];
      l?: number;
    };
  }
}

function readConsent(services: string): ConsentChoice | undefined {
  if (document.cookie.split(';').some((cookie) => cookie.trim() === `${REFUSAL_COOKIE}=1`)) return 'denied';
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as Partial<StoredConsent>;
    if (
      ![1, CONSENT_VERSION].includes(parsed.version ?? 0) ||
      !['allowed', 'denied'].includes(parsed.choice ?? '') ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= Date.now()
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    // A previous refusal remains a refusal. Permission names the actual services:
    // the old Yandex-only permission must never enable Google automatically.
    if (parsed.choice === 'denied') return 'denied';
    // Probe a separate key: writing back a read grant could overwrite a
    // withdrawal saved by another tab between our getItem and setItem.
    const probeKey = `${STORAGE_KEY}:probe`;
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    if (localStorage.getItem(STORAGE_KEY) !== value) return readConsent(services);
    if (parsed.version === 1 && services === 'yandex') return 'allowed';
    if (parsed.version !== CONSENT_VERSION || parsed.services !== services) return undefined;
    return parsed.choice;
  } catch {
    return undefined;
  }
}

function writeConsent(choice: ConsentChoice, services: string): boolean {
  try {
    const value: StoredConsent = {
      choice,
      version: CONSENT_VERSION,
      expiresAt: Date.now() + CONSENT_TTL_MS,
      services,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    document.cookie = `${REFUSAL_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    return true;
  } catch {
    if (choice === 'denied') {
      document.cookie = `${REFUSAL_COOKIE}=1; Max-Age=${CONSENT_TTL_MS / 1000}; Path=/; SameSite=Lax`;
    }
    // Quota/write failures must not leave an old permission behind. Removal
    // needs no additional quota and also notifies other open tabs.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* readConsent fails closed */ }
    return false;
  }
}

function clearAnalyticsCookies() {
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter((name) => name && /^(?:_ym|_yasc|yandexuid|_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name));
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
  if (url.hostname === 'instagram.com' || url.hostname.endsWith('.instagram.com')) return 'instagram_click';
  if (url.hostname === '2gis.kz' || url.hostname.endsWith('.2gis.kz')) {
    const kind = link.closest<HTMLElement>('.where-to-buy__card[data-kind]')?.dataset.kind;
    if (kind === 'supermarket') return 'map_aimer_click';
    if (kind === 'semeiniy') return 'map_semeiniy_click';
    return 'map_bakery_click';
  }
  return undefined;
}

function loadGoogleAnalytics(measurementId: string) {
  if (document.querySelector('[data-google-analytics]')) return;
  Object.assign(window, { [`ga-disable-${measurementId}`]: false });
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function (..._args: unknown[]) {
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  // Basic consent mode: neither this script nor any Google request exists
  // until the visitor explicitly allows analytics.
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.googleAnalytics = 'true';
  document.head.append(script);
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
  const hasMetrika = Number.isSafeInteger(counterId) && counterId > 0;
  const measurementId = root.dataset.measurementId;
  const hasGoogle = Boolean(measurementId && /^G-[A-Z0-9]+$/.test(measurementId));
  const allow = root.querySelector<HTMLButtonElement>('[data-cookie-allow]');
  const deny = root.querySelector<HTMLButtonElement>('[data-cookie-deny]');
  if ((!hasMetrika && !hasGoogle) || !allow || !deny) return () => {};
  const services = [hasGoogle && 'google', hasMetrika && 'yandex'].filter(Boolean).join(',');

  const controller = new AbortController();
  const { signal } = controller;
  let choice = readConsent(services);
  const spacer = scope.querySelector<HTMLElement>('[data-cookie-consent-spacer]');
  const resizeSpacer = () => {
    if (spacer && !root.hidden) spacer.style.height = `${root.offsetHeight + 16}px`;
  };
  const observer = new ResizeObserver(resizeSpacer);
  observer.observe(root);
  const loadAnalytics = () => {
    if (hasGoogle) loadGoogleAnalytics(measurementId!);
    if (hasMetrika) loadMetrika(counterId);
  };

  const show = () => {
    root.hidden = false;
    if (spacer) spacer.hidden = false;
    resizeSpacer();
  };
  const hide = () => {
    root.hidden = true;
    if (spacer) spacer.hidden = true;
  };
  // Withdrawal also reaches tabs when a failed write emits no storage event.
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(STORAGE_KEY) : undefined;
  const stopAndReload = () => {
    if (hasGoogle) Object.assign(window, { [`ga-disable-${measurementId}`]: true });
    clearAnalyticsCookies();
    location.reload();
  };
  channel?.addEventListener('message', (event) => {
    if (event.data !== 'denied') return;
    choice = 'denied';
    writeConsent('denied', services);
    stopAndReload();
  }, { signal });

  const choose = (next: ConsentChoice) => {
    const previous = choice;
    const saved = writeConsent(next, services);
    choice = next === 'allowed' && !saved ? undefined : next;
    if (next === 'allowed' && !saved) {
      // Without a writable preference we cannot safely restore permission.
      if (previous === 'allowed') stopAndReload();
      else show();
      return;
    }
    hide();
    if (next === 'allowed') loadAnalytics();
    if (next === 'denied') {
      if (hasGoogle) {
        // Do not send a denied-state ping: stop collection before reloading
        // into the saved refusal, where the tag is completely absent.
        Object.assign(window, { [`ga-disable-${measurementId}`]: true });
      }
      channel?.postMessage('denied');
      clearAnalyticsCookies();
      if (previous === 'allowed') location.reload();
    }
  };

  if (choice === 'allowed') loadAnalytics();
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
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      const goal = link ? goalForLink(link) : undefined;
      if (goal) {
        if (hasGoogle) window.gtag?.('event', goal, { send_to: measurementId });
        if (hasMetrika) window.ym?.(counterId, 'reachGoal', goal);
      }
    },
    { signal },
  );
  window.addEventListener(
    'storage',
    (event) => {
      if (event.key === STORAGE_KEY && event.newValue !== event.oldValue) {
        if (hasGoogle) Object.assign(window, { [`ga-disable-${measurementId}`]: true });
        location.reload();
      }
    },
    { signal },
  );

  return () => {
    channel?.close();
    controller.abort();
    observer.disconnect();
  };
}
