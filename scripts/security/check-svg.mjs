#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseFragment } from 'parse5';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, '../..');
const ignoredDirectories = new Set(['.astro', 'dist', 'node_modules', 'storybook-static']);
const sourceExtensions = new Set(['.astro', '.svg']);
const allowedElements = new Set(['circle', 'clippath', 'defs', 'g', 'path', 'rect', 'svg', 'use']);
const animationElements = new Set(['animate', 'animatemotion', 'animatetransform', 'discard', 'set']);

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.nodeName === 'string' && node.nodeName.startsWith('#') === false) visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}

function decodeCharacterReferences(value) {
  return value
    .replace(/&#x([\da-f]+);?/gi, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
    .replace(/&#(\d+);?/g, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&colon;?/gi, ':')
    .replace(/&tab;?/gi, '\t')
    .replace(/&newline;?/gi, '\n');
}

function compactReference(value) {
  return decodeCharacterReferences(value).replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
}

function isSafeLocalReference(value) {
  const reference = compactReference(value);
  return reference === '' || reference.startsWith('#');
}

function inspectMarkup(markup) {
  const reasons = new Set();
  let svgElementCount = 0;

  if (/<!DOCTYPE\b/i.test(markup)) reasons.add('DOCTYPE declarations are forbidden');
  if (/<!ENTITY\b/i.test(markup)) reasons.add('entity declarations are forbidden');
  if (/<\?xml-stylesheet\b/i.test(markup)) reasons.add('XML stylesheet processing instructions are forbidden');
  if (/<(?:[\w.-]+:)?script\b/i.test(markup)) reasons.add('script elements are forbidden');
  if (/<(?:[\w.-]+:)?foreignObject\b/i.test(markup)) reasons.add('foreignObject elements are forbidden');
  if (/<(?:[\w.-]+:)?style\b/i.test(markup)) reasons.add('style elements are forbidden');
  if (/\b(?:javascript|vbscript)\s*(?:&#(?:x0*3a|0*58);?|&colon;|:)/i.test(markup)) {
    reasons.add('executable URI schemes are forbidden');
  }
  if (/\b(?:@import|-moz-binding\s*:|expression\s*\()/i.test(markup)) {
    reasons.add('executable or importing CSS is forbidden');
  }

  const document = parseFragment(markup);
  walk(document, (node) => {
    const localName = (node.tagName ?? node.nodeName).split(':').at(-1).toLowerCase();
    if (localName === 'svg') svgElementCount += 1;
    if (localName === 'script') reasons.add('script elements are forbidden');
    if (localName === 'foreignobject') reasons.add('foreignObject elements are forbidden');
    if (localName === 'style') reasons.add('style elements are forbidden');
    if (animationElements.has(localName)) reasons.add('SVG animation elements are forbidden');
    if (!allowedElements.has(localName)) reasons.add(`unexpected element <${localName}> is forbidden`);

    for (const attribute of node.attrs ?? []) {
      const name = attribute.name.split(':').at(-1).toLowerCase();
      if (/^on[a-z]/i.test(name)) reasons.add('event handler attributes are forbidden');
      if (/\\/.test(attribute.value)) reasons.add('escape sequences in SVG attributes are forbidden');
      if (name === 'base') reasons.add('base URL attributes are forbidden');
      if ((name === 'href' || name === 'src') && !isSafeLocalReference(attribute.value)) {
        reasons.add('external or executable references are forbidden');
      }

      const urls = attribute.value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi);
      for (const match of urls) {
        if (!isSafeLocalReference(match[2])) {
          reasons.add('external URL references are forbidden');
        }
      }
    }
  });
  if (svgElementCount > 1) reasons.add('nested SVG elements are forbidden');

  for (const match of markup.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!isSafeLocalReference(match[2])) reasons.add('external URL references are forbidden');
  }

  return [...reasons];
}

function withoutAstroFrontmatter(source) {
  return source.replace(/^\uFEFF?\s*---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
}

function inlineSvgFragments(source) {
  const markup = withoutAstroFrontmatter(source);
  const fragments = [];
  const reasons = new Set();
  const token = /<\s*(\/?)\s*(svg|script|style)\b[^>]*>/gi;
  let depth = 0;
  let fragmentStart = -1;
  let match;

  while ((match = token.exec(markup)) !== null) {
    const closing = match[1] === '/';
    const name = match[2].toLowerCase();

    if (depth === 0 && name !== 'svg') {
      if (!closing) {
        const close = new RegExp(`<\\s*\\/\\s*${name}\\s*>`, 'gi');
        close.lastIndex = token.lastIndex;
        const end = close.exec(markup);
        token.lastIndex = end ? close.lastIndex : markup.length;
      }
      continue;
    }
    if (name !== 'svg') continue;

    const selfClosing = !closing && /\/\s*>$/.test(match[0]);
    if (closing) {
      if (depth === 0) {
        reasons.add('unmatched inline SVG closing tag');
        continue;
      }
      depth -= 1;
      if (depth === 0) fragments.push(markup.slice(fragmentStart, token.lastIndex));
      continue;
    }

    if (selfClosing) {
      if (depth > 0) reasons.add('nested SVG elements are forbidden');
      else fragments.push(match[0]);
      continue;
    }
    if (depth === 0) fragmentStart = match.index;
    else reasons.add('nested SVG elements are forbidden');
    depth += 1;
  }

  if (depth !== 0) reasons.add('inline SVG is not closed');
  return { fragments, reasons };
}

export function inspectSvg(source, { inline = false } = {}) {
  const reasons = new Set();
  const extraction = inline ? inlineSvgFragments(source) : { fragments: [source], reasons: [] };

  if (!inline && !/<svg\b/i.test(source)) reasons.add('SVG root element is missing');
  for (const reason of extraction.reasons) reasons.add(reason);
  for (const fragment of extraction.fragments) {
    for (const reason of inspectMarkup(fragment)) reasons.add(reason);
  }
  return [...reasons];
}

function sourceFiles(root) {
  const files = [];
  const website = join(root, 'website');
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && sourceExtensions.has(extname(entry.name).toLowerCase())) files.push(path);
    }
  }
  visit(website);
  return files.sort();
}

export function scanSvgSources(root = defaultRoot) {
  const findings = [];
  for (const file of sourceFiles(root)) {
    const extension = extname(file).toLowerCase();
    const reasons = inspectSvg(readFileSync(file, 'utf8'), { inline: extension === '.astro' });
    for (const reason of reasons) {
      findings.push({ file: relative(root, file).replaceAll('\\', '/'), reason });
    }
  }
  return findings;
}

export function checkSvgSources(root = defaultRoot) {
  const findings = scanSvgSources(root);
  if (findings.length > 0) {
    const summary = findings.map(({ file, reason }) => `${file}: ${reason}`).join('\n');
    throw new Error(`unsafe SVG source detected:\n${summary}`);
  }
  return sourceFiles(root).length;
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  try {
    const checked = checkSvgSources();
    console.log(`[svg] checked ${checked} SVG and Astro source files`);
  } catch (error) {
    console.error(`[svg] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
