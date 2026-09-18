import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getCanonicalUrl, validateWebsiteOrigin } from './site-origin.mjs';

describe('validateWebsiteOrigin', () => {
  test('allows an absent optional origin', () => {
    assert.equal(validateWebsiteOrigin(undefined), undefined);
    assert.equal(validateWebsiteOrigin(null), undefined);
    assert.equal(validateWebsiteOrigin(''), undefined);
  });

  test('requires an origin when requested', () => {
    assert.throws(() => validateWebsiteOrigin(undefined, { required: true }), {
      name: 'TypeError',
      message: 'PUBLIC_WEBSITE_URL is required for this operation.',
    });
  });

  test('normalizes valid HTTPS origins', () => {
    assert.equal(validateWebsiteOrigin('https://EXAMPLE.com:443/'), 'https://example.com');
    assert.equal(validateWebsiteOrigin('https://preview.pages.dev'), 'https://preview.pages.dev');
    assert.equal(validateWebsiteOrigin('https://example.com:8443'), 'https://example.com:8443');
  });

  test('rejects non-HTTPS schemes and malformed values', () => {
    for (const value of [
      'http://example.com',
      'ftp://example.com',
      '//example.com',
      'example.com',
      ' https://example.com',
      'https://exam\nple.com',
      'https://example.com\\',
      'https://example.com\t',
      42,
    ]) {
      assert.throws(() => validateWebsiteOrigin(value), TypeError);
    }
  });

  test('rejects credentials without exposing the supplied value', () => {
    const supplied = 'https://user:secret@example.com';
    assert.throws(
      () => validateWebsiteOrigin(supplied),
      (error) => error instanceof TypeError && !error.message.includes(supplied) && !error.message.includes('secret'),
    );
  });

  test('rejects paths, queries, and fragments, including empty delimiters', () => {
    for (const value of [
      'https://example.com/path',
      'https://example.com/%2e',
      'https://example.com?campaign=launch',
      'https://example.com?',
      'https://example.com#section',
      'https://example.com#',
    ]) {
      assert.throws(() => validateWebsiteOrigin(value), TypeError);
    }
  });
});

describe('getCanonicalUrl', () => {
  test('uses the normalized origin and preserves an absolute path', () => {
    assert.equal(
      getCanonicalUrl('https://EXAMPLE.com:443/', '/privacy/'),
      'https://example.com/privacy/',
    );
  });

  test('returns undefined when the optional origin is absent', () => {
    assert.equal(getCanonicalUrl(undefined, '/privacy/'), undefined);
  });

  test('does not permit a pathname to replace the validated origin', () => {
    assert.throws(() => getCanonicalUrl('https://example.com', '//attacker.example/path'), TypeError);
    assert.throws(() => getCanonicalUrl('https://example.com', '/\\attacker.example/path'), TypeError);
    assert.throws(() => getCanonicalUrl('https://example.com', '/privacy/?query=value'), TypeError);
    assert.throws(() => getCanonicalUrl('https://example.com', '/privacy/#fragment'), TypeError);
  });
});
