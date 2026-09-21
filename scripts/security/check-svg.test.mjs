import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectSvg, scanSvgSources } from './check-svg.mjs';

const maliciousSamples = [
  ['scripts', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
  ['namespaced scripts', '<svg xmlns="http://www.w3.org/2000/svg"><x:script /></svg>'],
  ['foreignObject HTML', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><iframe srcdoc="x" /></foreignObject></svg>'],
  ['event handlers', '<svg xmlns="http://www.w3.org/2000/svg"><path onload="alert(1)" /></svg>'],
  ['remote references', '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/a.svg#x" /></svg>'],
  ['protocol-relative references', '<svg xmlns="http://www.w3.org/2000/svg"><image href="//example.com/pixel" /></svg>'],
  ['entity-obfuscated script URLs', '<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#x09;script&#x3a;alert(1)" /></svg>'],
  ['external CSS URLs', '<svg xmlns="http://www.w3.org/2000/svg"><style>path{fill:url(https://example.com/x)}</style></svg>'],
  ['external entities', '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>'],
  ['XML stylesheets', '<?xml-stylesheet href="https://example.com/x.css"?><svg xmlns="http://www.w3.org/2000/svg" />'],
  ['SMIL href mutation', '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="href" to="javascript:alert(1)" /></svg>'],
  ['SVG animation', '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="#safe;javascript:alert(1)" /></svg>'],
  ['unexpected HTML elements', '<svg xmlns="http://www.w3.org/2000/svg"><iframe srcdoc="payload" /></svg>'],
  ['escaped CSS URLs', '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:u\\72l(https://example.com/x)" /></svg>'],
  ['escaped presentation attribute URLs', '<svg xmlns="http://www.w3.org/2000/svg"><path fill="u\\72l(https://example.com/x)" /></svg>'],
  ['escaped CSS imports', '<svg xmlns="http://www.w3.org/2000/svg"><style>\\40import url(https://example.com/x)</style></svg>'],
  ['base URL reference rewriting', '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://example.com/"><use href="#shape" /></svg>'],
];

for (const [name, source] of maliciousSamples) {
  test(`rejects ${name}`, () => {
    assert.notEqual(inspectSvg(source).length, 0);
  });
}

test('allows inert SVG with local fragment references', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="shape" /></defs><use href="#shape" fill="url(#paint)" /></svg>';
  assert.deepEqual(inspectSvg(source), []);
});

test('rejects unsafe inline SVG without treating ordinary Astro scripts as SVG content', () => {
  const safeAstro = '<div>content</div><script>document.body.dataset.ready = "yes"</script>';
  const unsafeAstro = '<svg><path onclick="alert(1)" /></svg><script>void 0</script>';
  assert.deepEqual(inspectSvg(safeAstro, { inline: true }), []);
  assert.notEqual(inspectSvg(unsafeAstro, { inline: true }).length, 0);
});

test('rejects an unsafe self-closing inline SVG', () => {
  assert.notEqual(inspectSvg('<svg onload="alert(1)" />', { inline: true }).length, 0);
});

test('rejects nested SVG and scans through the outer closing tag', () => {
  const nested = '<svg><svg></svg><script>alert(1)</script></svg>';
  const reasons = inspectSvg(nested, { inline: true });
  assert.ok(reasons.includes('nested SVG elements are forbidden'));
  assert.ok(reasons.includes('script elements are forbidden'));
});

test('rejects unmatched inline SVG tags', () => {
  assert.notEqual(inspectSvg('<svg><path /></div>', { inline: true }).length, 0);
  assert.notEqual(inspectSvg('</svg>', { inline: true }).length, 0);
});

test('all current repository SVG sources pass', () => {
  assert.deepEqual(scanSvgSources(), []);
});
