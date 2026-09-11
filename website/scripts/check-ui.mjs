import { readdir, readFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parse } from '@astrojs/compiler';
import ts from 'typescript';

const cosmetic =
  /^(style|class|className|class:list|css|sx|background|backgroundColor|border|borderRadius|boxShadow|fontSize|color)$/;
// Only markup generated inside an owner (raw SVG, Picture, SplitText) may cross Astro's scope.
const generatedMarkup = {
  'HeaderMascot.astro': new Set(['svg']),
  'HoneyCakeIllustration.astro': new Set(['picture', 'img']),
  'Hero.astro': new Set(['.hero__text-line-mask']),
  'ConversionSection.astro': new Set(['svg', 'img']),
};
const layoutProps = /^(padding|margin|gap|flex|grid|dir|width|height|position|inset)$/;
const failures = [];
let componentCount = 0;
async function inspect(file) {
  const source = await readFile(file, 'utf8');
  const name = basename(file);
  const { ast } = await parse(source, { position: true });
  const fail = (message) => failures.push(`${file}: ${message}`);
  function visit(node) {
    if (node.type === 'component') {
      for (const attribute of node.attributes) {
        if (
          cosmetic.test(attribute.name) ||
          (node.name !== 'Wrapper' &&
            layoutProps.test(attribute.name) &&
            !['Image', 'Picture'].includes(node.name))
        )
          fail(`${node.name} receives cosmetic ${attribute.name}`);
        if (attribute.kind === 'spread') fail(`${node.name} receives an unchecked props spread`);
      }
    }
    if ('attributes' in node) {
      if (name !== 'Wrapper.astro' && node.attributes.some((a) => a.name === 'style'))
        fail('inline styles outside Wrapper');
      if (node.attributes.some((a) => a.kind === 'spread')) fail('unchecked DOM attribute spread');
    }
    if (node.type === 'element' && node.name === 'style') {
      if (file.includes('/pages/') || file.includes('/layouts/'))
        fail('page/layout owns a stylesheet');
      const css = node.children
        .filter((c) => 'value' in c)
        .map((c) => c.value)
        .join('');
      if (node.attributes.some((a) => a.name === 'is:global')) fail('global component stylesheet');
      for (const match of css.matchAll(/:global\(([^)]+)\)/g)) {
        if (!generatedMarkup[name]?.has(match[1])) fail(`cross-component selector ${match[0]}`);
      }
    }
    if (node.type === 'frontmatter') {
      const frontmatter = ts.createSourceFile(
        file + '.ts',
        node.value,
        ts.ScriptTarget.Latest,
        true,
      );
      function inspectType(item) {
        if (
          (ts.isInterfaceDeclaration(item) || ts.isTypeAliasDeclaration(item)) &&
          item.name.text === 'Props'
        ) {
          const text = item.getText(frontmatter);
          if (name !== 'Wrapper.astro' && /HTMLAttributes|CSSProperties|Record\s*</.test(text))
            fail('unbounded component props');
          if (
            /\b(?:style|className|class|css|sx|background|borderRadius|fontSize)\??\s*:/.test(text)
          )
            fail('cosmetic props API');
        }
        ts.forEachChild(item, inspectType);
      }
      inspectType(frontmatter);
    }
    if ('children' in node) node.children.forEach(visit);
  }
  visit(ast);
  if (file.includes('/components/')) {
    componentCount++;
    try {
      await access(`stories/${name.replace('.astro', '.stories.ts')}`);
    } catch {
      fail('missing Storybook story');
    }
  }
}
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === 'src/components') failures.push(`${file}: components must stay flat`);
      await walk(file);
    } else if (entry.name.endsWith('.astro')) await inspect(file);
  }
}
await walk('src');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `UI boundaries OK: ${componentCount} flat components, each with a Storybook story; no cosmetic pass-throughs.`,
  );
}
