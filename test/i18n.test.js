import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  PREFIXED_LOCALES,
  localeFromPath,
  localeHref,
  localeMeta,
  localeOptions,
  localizedPathname,
  stripLocalePrefix,
} from '../src/i18n/config.js';
import { interpolate, placeholders, pluralCategory, pluralFrom, translateFrom } from '../src/i18n/core.js';
import { DICTIONARIES, serializeDictionary } from '../src/i18n/index.js';
import { inlineParts } from '../src/i18n/format.js';
import {
  formatDate,
  postHref,
  publishedPosts,
  readingTime,
  relatedPosts,
  tagLabel,
} from '../src/lib/blog.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const blogDir = fileURLToPath(new URL('../src/content/blog/', import.meta.url));
const dictionary = (locale) => DICTIONARIES[locale];
const english = dictionary('en');
const allDictionaries = LOCALES.map((locale) => [locale, dictionary(locale)]);
const translationKeys = [
  'browser-only-markdown-to-pdf',
  'browser-print-markdown-pdf',
  'chapter-sequencing-reordering-pdf',
  'github-branch-tag-commit-pdf',
  'github-readme-to-pdf',
  'github-repository-markdown-tree',
  'live-markdown-preview-pdf',
  'markdown-code-blocks-to-pdf',
  'markdown-editor-paste-pdf',
  'markdown-file-search-filter',
  'markdown-file-upload-to-pdf',
  'markdown-folder-selection-book',
  'markdown-pdf-cover-page',
  'markdown-relative-images-links-pdf',
  'markdown-table-of-contents-pdf',
  'markdown-tables-to-pdf',
  'markdown-zip-pdf-export',
  'multi-file-markdown-book',
  'multilingual-markdown-pdf-fonts',
  'readme-pdf-print-themes',
  'readme-to-pdf-use-cases',
];
const nonEnglish = PREFIXED_LOCALES;

function read(path) {
  return readFileSync(path, 'utf8');
}

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, 'expected YAML frontmatter');
  return match[1];
}

function frontmatterValue(source, key) {
  const line = frontmatter(source)
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}:`));
  if (!line) return undefined;
  return line.slice(key.length + 1).trim().replace(/^"(.*)"$/, '$1');
}

function body(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function markdownFacts(source) {
  const headings = [];
  const codeBlocks = [];
  let inFence = false;
  let fence = null;
  for (const line of body(source).split(/\r?\n/)) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fence = fenceMatch[1];
        codeBlocks.push([]);
      } else {
        inFence = false;
        fence = null;
      }
      continue;
    }
    if (inFence) {
      codeBlocks[codeBlocks.length - 1].push(line);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) headings.push({ depth: heading[1].length, text: heading[2] });
  }
  const text = body(source);
  const urls = [...text.matchAll(/https?:\/\/[^\s)\]"'<>,]+/g)].map((match) =>
    match[0].replace(/[.;:]$/, ''),
  );
  return {
    headings,
    codeBlocks: codeBlocks.map((lines) => lines.join('\n')),
    urls: [...new Set(urls)].sort(),
  };
}

function tagsFrom(source) {
  const value = frontmatterValue(source, 'tags');
  assert.ok(value, 'expected tags');
  return JSON.parse(value);
}

describe('locale registry and path mapping', () => {
  it('keeps English unprefixed and prefixes the other eight locales', () => {
    assert.deepEqual(LOCALES, ['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt']);
    assert.equal(DEFAULT_LOCALE, 'en');
    assert.deepEqual(PREFIXED_LOCALES, ['es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt']);
    assert.equal(localeHref('en', '/'), '/');
    assert.equal(localeHref('en', '/blog/'), '/blog/');
    assert.equal(localeHref('es', '/'), '/es/');
    assert.equal(localeHref('es', '/blog/'), '/es/blog/');
    assert.equal(localeHref('zh', '/blog/github-readme-to-pdf/'), '/zh/blog/github-readme-to-pdf/');
  });

  it('publishes accurate language metadata for every locale', () => {
    for (const locale of LOCALES) {
      const meta = localeMeta(locale);
      assert.equal(meta.htmlLang, locale === 'zh' ? 'zh-Hans' : locale === 'pt' ? 'pt-BR' : locale);
      assert.equal(meta.prefix, locale === 'en' ? '' : locale);
      assert.ok(meta.label.length > 0);
      assert.ok(meta.pluralCategories.includes('other'));
    }
    assert.equal(localeMeta('es').provisional, true);
    assert.deepEqual(
      localeOptions().map((option) => option.locale),
      LOCALES,
    );
  });

  it('strips and replaces only known locale prefixes', () => {
    assert.equal(stripLocalePrefix('/es/blog/github-readme-to-pdf/'), '/blog/github-readme-to-pdf/');
    assert.equal(stripLocalePrefix('/ja'), '/');
    assert.equal(stripLocalePrefix('/blog/'), '/blog/');
    assert.equal(stripLocalePrefix('/es?x=1#top'), '/');
    assert.equal(localizedPathname('/es/blog/x/', 'ja'), '/ja/blog/x/');
    assert.equal(localizedPathname('/ja/blog/x/', 'en'), '/blog/x/');
    assert.equal(localizedPathname('/blog/x/', 'pt'), '/pt/blog/x/');
    assert.equal(localeFromPath('/pt/blog/'), 'pt');
    assert.equal(localeFromPath('/blog/'), 'en');
  });
});

describe('dictionary parity and translation quality', () => {
  it('ships the same non-empty 366 keys in every locale', () => {
    const expected = Object.keys(english).sort();
    assert.equal(expected.length, 366);
    for (const [locale, messages] of allDictionaries) {
      assert.deepEqual(Object.keys(messages).sort(), expected, `${locale} key parity`);
      for (const key of expected) {
        assert.equal(typeof messages[key], 'string', `${locale}:${key} must be a string`);
        assert.ok(messages[key].trim().length > 0, `${locale}:${key} must not be empty`);
      }
    }
  });

  it('preserves placeholders and inline-code markers exactly', () => {
    const codeSegments = (value) => [...value.matchAll(/\{code:([^}]*)\}/g)].map((m) => m[1]);
    for (const key of Object.keys(english)) {
      const expectedPlaceholders = placeholders(english[key]);
      const expectedCode = codeSegments(english[key]);
      for (const [locale, messages] of allDictionaries) {
        assert.deepEqual(placeholders(messages[key]), expectedPlaceholders, `${locale}:${key}`);
        assert.deepEqual(codeSegments(messages[key]), expectedCode, `${locale}:${key}`);
      }
    }
  });

  it('provides every CLDR plural category the locale can select', () => {
    const bases = ['common.files', 'common.chapters', 'common.markdownFiles', 'common.guides', 'common.failedFiles'];
    for (const [locale, messages] of allDictionaries) {
      for (const base of bases) {
        for (const category of localeMeta(locale).pluralCategories) {
          assert.ok(
            Object.hasOwn(messages, `${base}.${category}`),
            `${locale} is missing ${base}.${category}`,
          );
        }
        for (const category of ['one', 'few', 'many', 'other']) {
          assert.ok(
            Object.hasOwn(messages, `${base}.${category}`),
            `${locale} is missing parity key ${base}.${category}`,
          );
        }
      }
    }
    assert.equal(pluralCategory('ru', 1), 'one');
    assert.equal(pluralCategory('ru', 2), 'few');
    assert.equal(pluralCategory('ru', 5), 'many');
    assert.match(pluralFrom('ru', 'common.files', 2, {}, dictionary('ru')), /2/);
  });

  it('contains genuine translations for core UI messages', () => {
    const core = [
      'meta.home.title',
      'home.hero.kicker',
      'home.hero.titleLine1',
      'home.hero.lead',
      'home.converter.fetch',
      'home.book.scan',
      'nav.converter',
      'footer.credit',
      'blog.title',
      'blog.lead',
      'a11y.tags',
      'lang.label',
      'home.privacy.title',
    ];
    for (const locale of nonEnglish) {
      for (const key of core) {
        assert.notEqual(
          dictionary(locale)[key],
          english[key],
          `${locale}:${key} still contains English copy`,
        );
      }
    }
  });

  it('populates every dict with locale-aware dates and safe serialization', () => {
    assert.notEqual(formatDate(new Date('2026-10-14T00:00:00Z'), 'es'), formatDate(new Date('2026-10-14T00:00:00Z'), 'en'));
    assert.equal(translateFrom(english, 'home.hero.primary'), 'Start converting');
    assert.equal(interpolate('{count} files in {repo}', { count: 3, repo: 'x' }), '3 files in x');
    assert.equal(translateFrom(english, 'missing.key'), 'missing.key');
    for (const locale of LOCALES) {
      const payload = JSON.parse(serializeDictionary(locale));
      assert.equal(payload.locale, locale);
      assert.deepEqual(Object.keys(payload.messages).sort(), Object.keys(english).sort());
      assert.ok(!serializeDictionary(locale).includes('</script'));
    }
  });

  it('splits {code:…} messages without injecting HTML', () => {
    const parts = inlineParts('Run {code:npm test} in the repository.');
    assert.deepEqual(parts, [
      { type: 'text', value: 'Run ' },
      { type: 'code', value: 'npm test' },
      { type: 'text', value: ' in the repository.' },
    ]);
    assert.deepEqual(inlineParts('<b>plain</b>'), [{ type: 'text', value: '<b>plain</b>' }]);
  });
});

describe('blog inventory and translation structure', () => {
  it('publishes all 21 feature and guide articles in each of the nine locales', () => {
    const englishFiles = readdirSync(blogDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(englishFiles, translationKeys.map((key) => `${key}.md`).sort());

    for (const locale of nonEnglish) {
      const directory = `${blogDir}${locale}`;
      assert.ok(existsSync(directory), `${locale} translation directory is missing`);
      const files = readdirSync(directory).filter((name) => name.endsWith('.md')).sort();
      assert.deepEqual(files, translationKeys.map((key) => `${key}.md`).sort(), `${locale} inventory`);
    }
  });

  it('keeps every translation structurally identical to its English source', () => {
    for (const key of translationKeys) {
      const source = read(`${blogDir}${key}.md`);
      const sourceFacts = markdownFacts(source);
      const sourceTags = tagsFrom(source);
      for (const locale of nonEnglish) {
        const translated = read(`${blogDir}${locale}/${key}.md`);
        assert.equal(frontmatterValue(translated, 'locale'), locale, `${locale}/${key} locale`);
        assert.equal(
          frontmatterValue(translated, 'translationKey'),
          key,
          `${locale}/${key} translationKey`,
        );
        assert.deepEqual(tagsFrom(translated), sourceTags, `${locale}/${key} tags stay stable`);
        assert.equal(
          frontmatterValue(translated, 'pubDate'),
          frontmatterValue(source, 'pubDate'),
          `${locale}/${key} pubDate`,
        );
        assert.equal(
          frontmatterValue(translated, 'updatedDate'),
          frontmatterValue(source, 'updatedDate'),
          `${locale}/${key} updatedDate`,
        );
        assert.equal(
          frontmatterValue(translated, 'featured'),
          key === 'github-readme-to-pdf' ? 'true' : undefined,
          `${locale}/${key} featured`,
        );
        assert.ok(frontmatterValue(translated, 'title').length <= 90, `${locale}/${key} title length`);
        assert.ok(
          frontmatterValue(translated, 'description').length <= 180,
          `${locale}/${key} description length`,
        );
        assert.notEqual(frontmatterValue(translated, 'title'), frontmatterValue(source, 'title'));
        assert.notEqual(
          frontmatterValue(translated, 'description'),
          frontmatterValue(source, 'description'),
        );
        assert.ok(!translated.includes('\uFFFD'), `${locale}/${key} contains a replacement character`);

        const facts = markdownFacts(translated);
        assert.deepEqual(
          facts.headings.map((heading) => heading.depth),
          sourceFacts.headings.map((heading) => heading.depth),
          `${locale}/${key} heading structure`,
        );
        assert.equal(facts.headings.length, sourceFacts.headings.length, `${locale}/${key} heading count`);
        assert.deepEqual(facts.codeBlocks, sourceFacts.codeBlocks, `${locale}/${key} code blocks`);
        assert.deepEqual(facts.urls, sourceFacts.urls, `${locale}/${key} URLs`);
      }
    }
  });
});

describe('locale-aware blog helpers', () => {
  const makePost = (key, locale, pubDate, tags, bodyText = 'word '.repeat(440)) => ({
    id: locale === 'en' ? key : `${locale}/${key}`,
    body: bodyText,
    data: {
      title: key,
      description: 'description',
      pubDate: new Date(pubDate),
      tags,
      locale,
      translationKey: key,
      draft: false,
    },
  });

  it('builds prefixed article URLs and localized labels', () => {
    const post = makePost('guide', 'es', '2026-01-01', ['PDF']);
    assert.equal(postHref(post, 'es'), '/es/blog/guide/');
    assert.equal(postHref(post, 'en'), '/blog/guide/');
    assert.equal(tagLabel('PDF', (key) => (key === 'tags.PDF' ? 'PDF' : key)), 'PDF');
    assert.equal(tagLabel('Unknown', (key) => key), 'Unknown');
  });

  it('filters by locale and picks related posts by shared tags', () => {
    const posts = [
      makePost('one', 'es', '2026-01-01', ['PDF']),
      makePost('two', 'es', '2026-02-01', ['PDF']),
      makePost('three', 'ja', '2026-03-01', ['PDF']),
    ];
    assert.deepEqual(
      publishedPosts(posts, 'es').map((post) => post.data.translationKey),
      ['two', 'one'],
    );
    assert.deepEqual(
      relatedPosts(posts, posts[0], 'es').map((post) => post.data.translationKey),
      ['two'],
    );
  });

  it('uses characters for CJK reading time and words elsewhere', () => {
    assert.equal(readingTime('word '.repeat(440), 'en'), 2);
    assert.equal(readingTime('日本語'.repeat(600), 'ja'), 4);
    assert.equal(readingTime('', 'en'), 1);
  });
});
