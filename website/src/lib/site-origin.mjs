const INVALID_ORIGIN_MESSAGE =
  'PUBLIC_WEBSITE_URL must be an HTTPS origin without credentials, a path, query, or fragment.';
const REQUIRED_ORIGIN_MESSAGE = 'PUBLIC_WEBSITE_URL is required for this operation.';
const INVALID_INDEXING_MESSAGE = 'PUBLIC_ALLOW_INDEXING must be "true" or "false".';
const REQUIRED_INDEXING_MESSAGE = 'PUBLIC_ALLOW_INDEXING is required for this operation.';

/**
 * Validate and normalize the public website origin.
 *
 * @param {unknown} value
 * @param {{ required?: boolean }} [options]
 * @returns {string | undefined}
 */
export function validateWebsiteOrigin(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new TypeError(REQUIRED_ORIGIN_MESSAGE);
    return undefined;
  }

  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value)) throw new TypeError(INVALID_ORIGIN_MESSAGE);

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(INVALID_ORIGIN_MESSAGE);
  }

  const originMatch = /^https:\/\/[^/?#]+(.*)$/is.exec(value);
  const rawSuffix = originMatch?.[1];
  const isRootOrigin = rawSuffix === '' || rawSuffix === '/';

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    !isRootOrigin ||
    url.href !== `${url.origin}/`
  ) {
    throw new TypeError(INVALID_ORIGIN_MESSAGE);
  }

  return url.origin;
}

/**
 * Build a canonical URL from the configured origin and an absolute site path.
 *
 * @param {unknown} value
 * @param {string} pathname
 * @param {{ required?: boolean }} [options]
 * @returns {string | undefined}
 */
export function getCanonicalUrl(value, pathname, options) {
  const origin = validateWebsiteOrigin(value, options);
  if (origin === undefined) return undefined;

  if (!pathname.startsWith('/') || pathname.startsWith('//')) {
    throw new TypeError('Canonical pathname must be an absolute site path.');
  }

  const canonical = new URL(pathname, `${origin}/`);
  if (canonical.origin !== origin || canonical.search || canonical.hash) {
    throw new TypeError('Canonical pathname must stay within the configured origin without a query or fragment.');
  }
  return canonical.toString();
}

/**
 * Validate whether production pages may be indexed by search engines.
 *
 * An omitted value is deliberately safe for development and previews: no indexing.
 * Release commands require an explicit choice so a public deployment cannot silently
 * switch its search visibility.
 *
 * @param {unknown} value
 * @param {{ required?: boolean }} [options]
 * @returns {boolean}
 */
export function validateSearchIndexing(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new TypeError(REQUIRED_INDEXING_MESSAGE);
    return false;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new TypeError(INVALID_INDEXING_MESSAGE);
}
